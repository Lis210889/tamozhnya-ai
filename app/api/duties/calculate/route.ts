import { NextRequest, NextResponse } from 'next/server';
import { calculateCustomsPayments } from '../rates';

/**
 * API для расчета таможенных платежей
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tnvedCode, customsValue, quantity } = body;
    
    if (!tnvedCode || !customsValue) {
      return NextResponse.json(
        { error: 'Необходимо указать код ТН ВЭД и таможенную стоимость' },
        { status: 400 }
      );
    }
    
    const payments = calculateCustomsPayments(
      tnvedCode,
      parseFloat(customsValue),
      quantity ? parseInt(quantity) : 1
    );
    
    return NextResponse.json({
      success: true,
      ...payments,
      breakdown: {
        duty: payments.duty,
        vat: payments.vat,
        customsFee: payments.customsFee,
        total: payments.total,
      },
      year: 2026,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Ошибка расчета: ${error.message}` },
      { status: 500 }
    );
  }
}
