
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { ParsedProposal } from '../types';

// --- Initialize Firebase Admin ---
// Vercel 환경 변수에서 서비스 계정 키를 가져옵니다.
// 이 키는 JSON 형식의 문자열이어야 합니다.
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountString) {
  throw new Error('The FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
}

// 한번만 초기화하기 위한 장치
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Failed to parse or initialize Firebase Admin SDK:', error);
    throw new Error('Firebase Admin initialization failed.');
  }
}

const db = admin.firestore();

// --- API Handler ---
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { email, proposal } = req.body as { email: string; proposal: ParsedProposal };

    // --- 데이터 유효성 검사 ---
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }
    if (!proposal || typeof proposal !== 'object' || !proposal.productName) {
      return res.status(400).json({ error: 'Valid proposal data is required.' });
    }

    // --- Firestore에 데이터 저장 ---
    const leadRef = db.collection('leads').doc();
    await leadRef.set({
      email,
      productName: proposal.productName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      proposalData: proposal, // 전체 제안서 데이터 저장
    });

    return res.status(200).json({ message: 'Lead saved successfully.', id: leadRef.id });

  } catch (error) {
    console.error('Error in save-lead handler:', error);
    // 프로덕션 환경에서는 더 일반적인 에러 메시지를 보낼 수 있습니다.
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
    return res.status(500).json({ error: 'Failed to save lead.', details: errorMessage });
  }
}
