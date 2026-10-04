import { searchFiles } from './src/services/search.service.js';

const mockFiles = [
  {
    id: 'file-1',
    name: 'important_document.pdf',
    category: 'Education',
    uploadedAt: new Date(),
    size: 1024,
    mimeType: 'application/pdf',
    searchableText: 'This is a test document that contains the word UNICORN.',
  },
  {
    id: 'file-2',
    name: 'another_document.pdf',
    category: 'Finance',
    uploadedAt: new Date(),
    size: 2048,
    mimeType: 'application/pdf',
    searchableText: 'Nothing special here.',
  }
];

const results = searchFiles(mockFiles, { query: 'unicorn' });
console.log('Found files:', results.map(r => r.file.name));
console.log('Match reasons:', results.map(r => r.matchReasons));
