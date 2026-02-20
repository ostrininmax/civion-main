import { NextResponse } from 'next/server';
import { createBenefitPassToken } from '../../../../lib/verification-token';

export async function POST() {
  return NextResponse.json(
    createBenefitPassToken({
      scopes: ['student_discount', 'trp_valid', 'transport_concession'],
      ttlSeconds: 120
    })
  );
}
