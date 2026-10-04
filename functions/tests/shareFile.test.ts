import * as admin from 'firebase-admin';
import fft from 'firebase-functions-test';
import { shareFile } from '../src/index';

// Initialize firebase-functions-test in offline mode
const testEnv = fft();

describe('shareFile Cloud Function', () => {
  let wrapped: any;
  let mockGetUserByEmail: jest.SpyInstance;
  let mockGetDoc: jest.SpyInstance;
  let mockTransaction: jest.SpyInstance;

  beforeAll(() => {
    // Wrap the function so we can invoke it natively in tests
    wrapped = testEnv.wrap(shareFile);
  });

  beforeEach(() => {
    // Mock Admin SDK calls
    mockGetUserByEmail = jest.spyOn(admin.auth(), 'getUserByEmail');
    
    // Mock Firestore file existence check
    mockGetDoc = jest.fn();
    jest.spyOn(admin.firestore(), 'collection').mockReturnValue({
      doc: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn().mockReturnValue({
            get: mockGetDoc,
            id: 'mockShareId'
          })
        })
      })
    } as any);

    // Mock Firestore transaction
    mockTransaction = jest.spyOn(admin.firestore(), 'runTransaction').mockImplementation(async (cb: any) => {
      await cb({
        set: jest.fn()
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  it('unauthenticated caller → DENY', async () => {
    await expect(wrapped({ data: {} }, { auth: undefined }))
      .rejects.toThrow('You must be logged in to share files.');
  });

  it('invalid permission → DENY', async () => {
    await expect(wrapped({ 
      fileId: 'f1', recipientEmail: 'test@test.com', permission: 'invalid' 
    }, { 
      auth: { uid: 'u1', token: { email: 'u1@test.com' } } 
    })).rejects.toThrow("Permission must be 'view' or 'view_download'.");
  });

  it('invalid recipient → DENY', async () => {
    mockGetUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
    await expect(wrapped({ 
      fileId: 'f1', recipientEmail: 'nope@test.com', permission: 'view' 
    }, { 
      auth: { uid: 'u1', token: { email: 'u1@test.com' } } 
    })).rejects.toThrow("No account found with that email address.");
  });

  it('user attempting to share another user\'s file → DENY', async () => {
    mockGetUserByEmail.mockResolvedValue({ uid: 'u2', displayName: 'User 2' } as any);
    mockGetDoc.mockResolvedValue({ exists: false }); // File doesn't exist in u1's files

    await expect(wrapped({ 
      fileId: 'f2', recipientEmail: 'u2@test.com', permission: 'view' 
    }, { 
      auth: { uid: 'u1', token: { email: 'u1@test.com' } } 
    })).rejects.toThrow("File not found or you do not have permission to share it.");
  });

  it('forged ownerId → DENY', async () => {
    mockGetUserByEmail.mockResolvedValue({ uid: 'u2', displayName: 'User 2' } as any);
    mockGetDoc.mockResolvedValue({ exists: true, data: () => ({ name: 'test.pdf' }) });

    let capturedSetArgs: any[] = [];
    mockTransaction.mockImplementation(async (cb: any) => {
      await cb({
        set: (ref: any, data: any) => { capturedSetArgs.push(data); }
      });
    });

    await wrapped({ 
      fileId: 'f1', recipientEmail: 'u2@test.com', permission: 'view', ownerId: 'u3' // FORGED
    }, { 
      auth: { uid: 'u1', token: { email: 'u1@test.com' } } // REAL CALLER
    });

    expect(capturedSetArgs[0].ownerId).toBe('u1'); // Must enforce real caller
    expect(capturedSetArgs[0].ownerId).not.toBe('u3'); // Must ignore forged ownerId
  });

  it('authenticated owner sharing a file → PASS & successful share creates both records correctly → PASS', async () => {
    mockGetUserByEmail.mockResolvedValue({ uid: 'u2', displayName: 'User 2' } as any);
    mockGetDoc.mockResolvedValue({ exists: true, data: () => ({ name: 'test.pdf' }) });

    let capturedSetArgs: any[] = [];
    mockTransaction.mockImplementation(async (cb: any) => {
      await cb({
        set: (ref: any, data: any) => { capturedSetArgs.push(data); }
      });
    });

    const result = await wrapped({ 
      fileId: 'f1', recipientEmail: 'U2@test.com  ', permission: 'view_download' 
    }, { 
      auth: { uid: 'u1', token: { email: 'u1@test.com' } } 
    });

    expect(result.success).toBe(true);
    expect(result.recipientName).toBe('User 2');

    expect(mockTransaction).toHaveBeenCalled();
    expect(capturedSetArgs.length).toBe(2);

    // Sender record (sharedByMe)
    expect(capturedSetArgs[0]).toMatchObject({
      fileId: 'f1',
      fileName: 'test.pdf',
      ownerId: 'u1',
      recipientId: 'u2',
      recipientEmail: 'u2@test.com', // Normalized
      permission: 'view_download'
    });

    // Recipient record (sharedWithMe)
    expect(capturedSetArgs[1]).toMatchObject({
      fileId: 'f1',
      fileName: 'test.pdf',
      ownerId: 'u1',
      recipientId: 'u2',
      permission: 'view_download'
    });
    // Check that shareId was explicitly injected for recipient
    expect(capturedSetArgs[1].shareId).toBeDefined();
  });
});
