import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'degame_app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const url = String.fromEnvironment('SUPABASE_URL');
  const key = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');
  if (url.isEmpty || key.isEmpty) { runApp(const ConfigurationRequiredApp()); return; }
  await Supabase.initialize(url: url, anonKey: key);
  runApp(const DeGameTVApp());
}
class ConfigurationRequiredApp extends StatelessWidget {
  const ConfigurationRequiredApp({super.key});
  @override Widget build(BuildContext context) => MaterialApp(theme: ThemeData.dark(), home: const Scaffold(backgroundColor: Color(0xFF090909), body: Center(child: Padding(padding: EdgeInsets.all(28), child: Text('Configure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY using Flutter dart-defines.', textAlign: TextAlign.center)))));
}
