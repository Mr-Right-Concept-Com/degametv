import 'package:flutter_test/flutter_test.dart';
import 'package:degametv_native/main.dart';

void main() {
  testWidgets('configuration screen explains required public runtime values', (tester) async {
    await tester.pumpWidget(const ConfigurationRequiredApp());

    expect(find.textContaining('SUPABASE_URL'), findsOneWidget);
    expect(find.textContaining('SUPABASE_PUBLISHABLE_KEY'), findsOneWidget);
  });
}
