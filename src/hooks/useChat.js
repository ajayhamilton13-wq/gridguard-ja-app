import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isSupabaseReachable, supabase } from "../lib/supabase";

const CHAT_STORAGE_KEY = "offline_chat_messages_v1";
const RETRY_MS = 20000;

async function loadCachedMessages() {
  try {
    const stored = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
    const list = stored ? JSON.parse(stored) : [];
    // Older builds saved offline messages with a "local-" id but no pending flag
    return list.map((m) => (String(m.id).startsWith("local-") ? { ...m, pending: true } : m));
  } catch (error) {
    console.log("Chat storage load error:", error?.message || error);
    return [];
  }
}

const addUnique = (list, row) => (list.some((m) => m.id === row.id) ? list : [...list, row]);

// Community broadcast chat on Supabase. Messages sent while offline are kept on the
// phone with pending: true and sent automatically once Supabase can be reached again.
export function useChat(username) {
  const [messages, setMessages] = useState([]);
  const [offline, setOffline] = useState(false);
  const messagesRef = useRef(messages);
  const flushing = useRef(false);
  const loaded = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
    if (loaded.current) {
      AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages)).catch(() => {});
    }
  }, [messages]);

  const flushPending = useCallback(async () => {
    if (!supabase || flushing.current) return;
    flushing.current = true;
    try {
      const pending = messagesRef.current.filter((m) => m.pending);
      for (const m of pending) {
        const { data, error } = await supabase
          .from("messages")
          .insert({ text: m.text, username: m.username })
          .select()
          .single();
        if (error) {
          console.log("Pending message send failed:", error.message);
          break;
        }
        // Swap the local copy for the server row (realtime may already have added it)
        setMessages((prev) => {
          const without = prev.filter((x) => x.id !== m.id);
          return without.some((x) => x.id === data.id) ? without : [...without, data].sort(byTime);
        });
      }
    } finally {
      flushing.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase || !(await isSupabaseReachable())) {
      setOffline(true);
      return;
    }
    const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
    if (error) {
      console.log("Chat load error:", error.message);
      setOffline(true);
      return;
    }
    setOffline(false);
    setMessages((prev) => [...data, ...prev.filter((m) => m.pending)]);
    await flushPending();
  }, [flushPending]);

  // Load the cache, then the server, and listen for live changes
  useEffect(() => {
    let channel = null;
    (async () => {
      const cached = await loadCachedMessages();
      if (cached.length) setMessages(cached);
      loaded.current = true;
      await refresh();
    })();

    if (supabase) {
      channel = supabase
        .channel("messages")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
          setMessages((prev) => addUnique(prev, payload.new));
        })
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        })
        .subscribe();
    }

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });

    return () => {
      appStateSub.remove();
      if (channel) supabase.removeChannel(channel);
    };
  }, [refresh]);

  // While offline, keep retrying so queued messages go out on their own
  useEffect(() => {
    if (!offline || !supabase) return undefined;
    const timer = setInterval(refresh, RETRY_MS);
    return () => clearInterval(timer);
  }, [offline, refresh]);

  const queueLocally = (text) => {
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, text, username, created_at: new Date().toISOString(), pending: true },
    ]);
    setOffline(true);
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return false;

    if (!supabase || !(await isSupabaseReachable())) {
      queueLocally(trimmed);
      Alert.alert("Offline mode", "Your message is saved on this phone and will be sent automatically when you're back online.");
      return true;
    }

    const { data, error } = await supabase.from("messages").insert({ text: trimmed, username }).select().single();
    if (error) {
      Alert.alert("Error", error.message);
      return false;
    }
    setMessages((prev) => addUnique(prev, data));
    return true;
  };

  const deleteMessage = async (message) => {
    if (message.pending) {
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      return;
    }
    if (!supabase || !(await isSupabaseReachable())) {
      Alert.alert("Offline mode", "Deleting sent messages needs a connection. Try again when you're back online.");
      return;
    }
    const { error } = await supabase.from("messages").delete().eq("id", message.id);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
  };

  return { messages, offline, sendMessage, deleteMessage };
}

function byTime(a, b) {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}
