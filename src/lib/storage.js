import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { firebaseApp } from "./firebaseConfig";

// Uploads a report photo to Firebase Storage and returns its download URL
export async function uploadOutagePhoto(uid, reportId, uri) {
  if (!firebaseApp) throw new Error("Photos need Firebase to be configured.");
  const blob = await (await fetch(uri)).blob();
  const fileRef = ref(getStorage(firebaseApp), `outagePhotos/${uid}/${reportId}.jpg`);
  await uploadBytes(fileRef, blob, { contentType: blob.type || "image/jpeg" });
  return getDownloadURL(fileRef);
}
