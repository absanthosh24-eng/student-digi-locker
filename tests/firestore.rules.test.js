const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { setDoc, getDoc, doc, updateDoc, deleteDoc } = require('firebase/firestore');
const fs = require('fs');

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'test-digilocker',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore Security Rules', () => {
  let aliceDb, bobDb, unauthDb;
  
  beforeEach(() => {
    // We must pass token object matching rules checks (email matching what we expect)
    aliceDb = testEnv.authenticatedContext('alice', { email: 'alice@test.com' }).firestore();
    bobDb = testEnv.authenticatedContext('bob', { email: 'bob@test.com' }).firestore();
    unauthDb = testEnv.unauthenticatedContext().firestore();
  });

  // 1. Authenticated user can create their own users/{uid} profile
  test('1. Auth create own profile', async () => {
    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice'), { uid: 'alice', email: 'alice@test.com' }));
    
    // Fails if malicious uid or email
    await assertFails(setDoc(doc(aliceDb, 'users/alice'), { uid: 'alice', email: 'fake@test.com' }));
  });

  // 2. Authenticated user can read their own profile
  test('2. Auth read own profile', async () => {
    await assertSucceeds(getDoc(doc(aliceDb, 'users/alice')));
  });

  // 3. Authenticated user can update their own profile
  test('3. Auth update own profile', async () => {
    // Setup
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/alice'), { uid: 'alice', email: 'alice@test.com', name: 'Alice' });
    });
    
    // Allowed update
    await assertSucceeds(updateDoc(doc(aliceDb, 'users/alice'), { name: 'Alice 2' }));
    
    // Denied update (changing uid)
    await assertFails(updateDoc(doc(aliceDb, 'users/alice'), { uid: 'bob' }));
  });

  // 4. Authenticated user cannot read another user's profile
  test('4. Cannot read another user profile', async () => {
    await assertFails(getDoc(doc(aliceDb, 'users/bob')));
  });

  // 5. Unauthenticated user cannot read any private profile
  test('5. Unauth cannot read profile', async () => {
    await assertFails(getDoc(doc(unauthDb, 'users/alice')));
  });

  // 6. Auth user can create/read/update/delete own file metadata
  test('6. Manage own file metadata', async () => {
    const fileRef = doc(aliceDb, 'users/alice/files/file1');
    await assertSucceeds(setDoc(fileRef, { name: 'doc.pdf' }));
    await assertSucceeds(getDoc(fileRef));
    await assertSucceeds(updateDoc(fileRef, { name: 'doc2.pdf' }));
    await assertSucceeds(deleteDoc(fileRef));
  });

  // 7. Cannot access another user's file metadata
  test('7. Cannot access another user files', async () => {
    await assertFails(getDoc(doc(aliceDb, 'users/bob/files/file1')));
    await assertFails(setDoc(doc(aliceDb, 'users/bob/files/file1'), { name: 'hack' }));
  });

  // 8. Manage folders
  test('8. Manage own folders', async () => {
    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice/folders/folder1'), { name: 'F1' }));
    await assertFails(setDoc(doc(aliceDb, 'users/bob/folders/folder1'), { name: 'F1' }));
  });

  // 9. Manage categories
  test('9. Manage own categories', async () => {
    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice/categories/cat1'), { name: 'C1' }));
    await assertFails(setDoc(doc(aliceDb, 'users/bob/categories/cat1'), { name: 'C1' }));
  });

  // 10. Manage recycle-bin
  test('10. Manage own recycle-bin', async () => {
    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice/recycleBin/file1'), { deletedAt: Date.now() }));
    await assertFails(setDoc(doc(aliceDb, 'users/bob/recycleBin/file1'), { deletedAt: Date.now() }));
  });

  // 11. Cannot forge Shared With Me record
  test('11. Cannot forge sharedWithMe', async () => {
    // Alice tries to write to Bob's sharedWithMe
    await assertFails(setDoc(doc(aliceDb, 'users/bob/sharedWithMe/share1'), { ownerId: 'alice' }));
    
    // Alice even tries to write to her OWN sharedWithMe directly (blocked because only Cloud Functions can write here)
    await assertFails(setDoc(doc(aliceDb, 'users/alice/sharedWithMe/share1'), { ownerId: 'bob' }));
  });

  // 12. Sharing operations work only through intended flow
  test('12. Read/delete inbound shares, manage outbound shares', async () => {
    // Setup initial data by admin
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users/alice/sharedWithMe/share1'), { from: 'bob' });
      await setDoc(doc(db, 'users/alice/sharedByMe/share2'), { ownerId: 'alice' });
    });

    // Alice can read her inbound share
    await assertSucceeds(getDoc(doc(aliceDb, 'users/alice/sharedWithMe/share1')));
    // Alice can delete/revoke her inbound share
    await assertSucceeds(deleteDoc(doc(aliceDb, 'users/alice/sharedWithMe/share1')));

    // Alice can read her outbound share
    await assertSucceeds(getDoc(doc(aliceDb, 'users/alice/sharedByMe/share2')));
    // Alice can create an outbound share
    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice/sharedByMe/share3'), { ownerId: 'alice' }));
  });
});
