import 'package:degametv_native/models/wallet_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses Personal Wallet balances in major and minor units', () {
    final balance = WalletBalance.fromJson({
      'currency': 'NGN',
      'balance_minor': 125050,
      'balance_major': 1250.50,
    });

    expect(balance.currency, 'NGN');
    expect(balance.balanceMinor, 125050);
    expect(balance.balanceMajor, 1250.50);
  });

  test('parses wallet activity from the authenticated RPC response', () {
    final activity = WalletActivity.fromJson({
      'id': 'activity-1',
      'activity_type': 'ticket_purchase',
      'direction': 'outgoing',
      'amount_major': '2500.00',
      'currency': 'NGN',
      'status': 'posted',
      'description': 'Screening ticket',
      'created_at': '2026-11-21T12:00:00Z',
    });

    expect(activity.direction, 'outgoing');
    expect(activity.amountMajor, 2500);
    expect(activity.description, 'Screening ticket');
  });
}
