import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, deleteUser, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAb-7N0JjIkPiFx0LWh1pQKCDQW5gF0vqg",
  authDomain: "student-digilocker.firebaseapp.com",
  projectId: "student-digilocker",
  storageBucket: "student-digilocker.firebasestorage.app",
  messagingSenderId: "399545059684",
  appId: "1:399545059684:web:40933b12450999fd77d271"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  const email = `student-${Date.now()}@example.com`;
  const password = "Password123!";
  
  console.log("1. Registering test account...");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    console.log("   - Auth user created.");
    
    // Simulate what registerUser does in our code
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email,
      displayName: "Test Student",
      createdAt: new Date(),
    });
    console.log("   - Firestore profile created.");
    console.log("   PASS");

    console.log("2. Testing email verification trigger...");
    await sendEmailVerification(cred.user);
    console.log("   - Verification email sent.");
    console.log("   PASS");

    console.log("3. Testing logout...");
    await signOut(auth);
    console.log("   - Logged out successfully.");
    console.log("   PASS");

    console.log("4. Testing login with verified account...");
    const loginCred = await signInWithEmailAndPassword(auth, email, password);
    console.log("   - Logged in successfully.");
    console.log("   PASS");
    
    console.log("5. Testing profile read...");
    const profileSnap = await getDoc(doc(db, 'users', loginCred.user.uid));
    if (profileSnap.exists()) {
      console.log("   - Profile data retrieved.");
      console.log("   PASS");
    } else {
      throw new Error("Profile not found in Firestore.");
    }

    console.log("6. Testing forgot password trigger...");
    await sendPasswordResetEmail(auth, email);
    console.log("   - Reset email sent successfully.");
    console.log("   PASS");
    
    // Cleanup
    await deleteUser(loginCred.user);
    console.log("   - Test user cleaned up.");
    
  } catch (err) {
    console.error("FAIL:", err.message);
    process.exit(1);
  }
}

run();
