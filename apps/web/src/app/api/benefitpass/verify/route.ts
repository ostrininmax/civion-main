import { NextResponse } from 'next/server';
import { verifyBenefitPassToken } from '../../../../lib/verification-token';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') ?? '';
  return NextResponse.json(verifyBenefitPassToken(token));
}
