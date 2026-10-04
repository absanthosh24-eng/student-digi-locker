import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const shareFile = onCall(async (request: CallableRequest<any>) => {
  // 1. Verify Authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to share files.");
  }
  const callerUid = request.auth.uid;

  // 2. Extract and Validate Input
  const { fileId, recipientEmail, permission, expiresAt } = request.data;

  if (!fileId || typeof fileId !== "string") {
    throw new HttpsError("invalid-argument", "Missing or invalid fileId.");
  }
  if (!recipientEmail || typeof recipientEmail !== "string") {
    throw new HttpsError("invalid-argument", "Missing or invalid recipient email.");
  }
  if (permission !== "view" && permission !== "view_download") {
    throw new HttpsError("invalid-argument", "Permission must be 'view' or 'view_download'.");
  }

  // 3. Normalize Email
  const normalizedEmail = recipientEmail.trim().toLowerCase();
  
  if (request.auth.token.email?.toLowerCase() === normalizedEmail) {
    throw new HttpsError("invalid-argument", "You cannot share a file with yourself.");
  }

  try {
    // 4. Secure Recipient Lookup via Admin SDK
    let recipientRecord;
    try {
      recipientRecord = await admin.auth().getUserByEmail(normalizedEmail);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        throw new HttpsError("not-found", "No account found with that email address.");
      }
      throw err;
    }
    const recipientId = recipientRecord.uid;
    const recipientName = recipientRecord.displayName || normalizedEmail;

    // 5. Verify File Ownership
    const fileRef = db.collection("users").doc(callerUid).collection("files").doc(fileId);
    const fileSnap = await fileRef.get();
    
    if (!fileSnap.exists) {
      throw new HttpsError("not-found", "File not found or you do not have permission to share it.");
    }
    const fileData = fileSnap.data();
    const fileName = fileData?.name || "Unknown File";

    // 6. Prepare Share Records
    const shareId = db.collection("users").doc(callerUid).collection("sharedByMe").doc().id;
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    let parsedExpiry = null;
    if (expiresAt) {
      const date = new Date(expiresAt);
      if (isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        throw new HttpsError("invalid-argument", "Expiry must be a valid future date.");
      }
      parsedExpiry = admin.firestore.Timestamp.fromDate(date);
    }

    const shareData = {
      fileId,
      fileName,
      ownerId: callerUid,
      shareType: "account",
      permission,
      recipientId,
      recipientEmail: normalizedEmail,
      recipientName,
      status: "active",
      expiresAt: parsedExpiry,
      createdAt: now,
      updatedAt: now,
    };

    // 7. Atomic Transaction to write both records reliably
    const ownerShareRef = db.collection("users").doc(callerUid).collection("sharedByMe").doc(shareId);
    const recipientShareRef = db.collection("users").doc(recipientId).collection("sharedWithMe").doc(shareId);

    await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
      // Create outbound record
      transaction.set(ownerShareRef, shareData);
      // Create inbound record (recipient needs the shareId injected if they read it)
      transaction.set(recipientShareRef, { ...shareData, shareId });
    });

    return {
      success: true,
      shareId,
      recipientName,
      message: `File securely shared with ${normalizedEmail}`
    };

  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    console.error("shareFile error:", error);
    throw new HttpsError("internal", "An error occurred while sharing the file.");
  }
});
