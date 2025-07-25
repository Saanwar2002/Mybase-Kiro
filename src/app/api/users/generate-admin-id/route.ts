import { NextRequest, NextResponse } from 'next/server';
import { safeDoc } from '@/lib/firebase-utils';
import { getDoc, setDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const adminId = await generateSequentialAdminId();
    
    return NextResponse.json({ 
      success: true, 
      adminId 
    });

  } catch (error) {
    console.error('Error generating admin ID:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Function to generate sequential admin ID
async function generateSequentialAdminId(): Promise<string> {
  const counterRef = safeDoc('counters', 'adminId');
  if (!counterRef) {
    throw new Error('Database not available');
  }
  
  try {
    // Get current counter
    const counterDoc = await getDoc(counterRef);
    let currentId = 1;
    
    if (counterDoc.exists()) {
      currentId = counterDoc.data().currentId + 1;
    }
    
    // Update counter
    await setDoc(counterRef, { currentId }, { merge: true });
    
    return `AD${currentId.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating admin ID:', error);
    throw error;
  }
} 