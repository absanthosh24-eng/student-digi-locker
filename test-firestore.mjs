import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAb-7N0JjIkPiFx0LWh1pQKCDQW5gF0vqg",
  authDomain: "student-digilocker.firebaseapp.com",
  projectId: "student-digilocker"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  const email1 = `student1-${Date.now()}@example.com`;
  const email2 = `student2-${Date.now()}@example.com`;
  const password = "Password123!";
  let uid1, uid2;
  
  try {
    console.log("1. Register a new test student.");
    const cred1 = await createUserWithEmailAndPassword(auth, email1, password);
    uid1 = cred1.user.uid;
    console.log("2. Firebase Auth user created:", uid1);
    
    // Simulate what registerUser does
    await setDoc(doc(db, 'users', uid1), {
      uid: uid1,
      email: email1,
      displayName: "Student One",
      storageUsed: 0
    });
    console.log("3. users/{uid} created in Firestore.");
    
    // Create second user to test cross-access
    const cred2 = await createUserWithEmailAndPassword(auth, email2, password);
    uid2 = cred2.user.uid;
    await setDoc(doc(db, 'users', uid2), { uid: uid2, email: email2 });
    
    console.log("4. Read the same profile after login.");
    await signOut(auth);
    await signInWithEmailAndPassword(auth, email1, password);
    let snap = await getDoc(doc(db, 'users', uid1));
    console.log("   Profile read successfully. Display Name:", snap.data().displayName);
    
    console.log("5. Update the profile.");
    await updateDoc(doc(db, 'users', uid1), { displayName: "Updated Student One" });
    
    console.log("6. Confirm updated profile is stored and retrieved correctly.");
    snap = await getDoc(doc(db, 'users', uid1));
    console.log("   Profile updated successfully. New Name:", snap.data().displayName);
    
    console.log("7. Confirm an unauthenticated user cannot access the protected profile.");
    await signOut(auth);
    try {
      await getDoc(doc(db, 'users', uid1));
      console.log("   FAIL: Unauthenticated user was ABLE to read the profile!");
    } catch(err) {
      console.log("   PASS: Unauthenticated user blocked.", err.code);
    }
    
    console.log("8. Confirm one authenticated user cannot access another user's private profile.");
    await signInWithEmailAndPassword(auth, email2, password);
    try {
      await getDoc(doc(db, 'users', uid1));
      console.log("   FAIL: Authenticated user 2 was ABLE to read user 1's profile!");
    } catch(err) {
      console.log("   PASS: Cross-user access blocked.", err.code);
    }
    
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    process.exit(0);
  }
}

run();
