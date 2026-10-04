import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, deleteUser } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAb-7N0JjIkPiFx0LWh1pQKCDQW5gF0vqg",
  authDomain: "student-digilocker.firebaseapp.com",
  projectId: "student-digilocker"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function test() {
  const email = `test-${Date.now()}@example.com`;
  const password = "Password123!";
  
  console.log("Testing initialization... SUCCESS");
  
  try {
    console.log("Testing registration...");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Registration... SUCCESS");
    
    console.log("Testing email verification...");
    await sendEmailVerification(cred.user);
    console.log("Email verification... SUCCESS");
    
    console.log("Testing logout...");
    await signOut(auth);
    console.log("Logout... SUCCESS");
    
    console.log("Testing login...");
    const loginCred = await signInWithEmailAndPassword(auth, email, password);
    console.log("Login... SUCCESS");
    
    console.log("Testing forgot password...");
    await sendPasswordResetEmail(auth, email);
    console.log("Forgot password... SUCCESS");
    
    // Cleanup
    await deleteUser(loginCred.user);
    console.log("Test user cleaned up.");
    
  } catch (error) {
    console.error("FAILED:", error.message);
    process.exit(1);
  }
}

test();
