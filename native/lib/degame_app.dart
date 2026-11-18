import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/home_screen.dart';

const red = Color(0xFFED1C18);
const black = Color(0xFF090909);
const panel = Color(0xFF171717);
class DeGameTVApp extends StatelessWidget {
  const DeGameTVApp({super.key});
  @override Widget build(BuildContext context) => MaterialApp(title: 'DeGameTV', debugShowCheckedModeBanner: false, theme: ThemeData(brightness: Brightness.dark, scaffoldBackgroundColor: black, colorScheme: const ColorScheme.dark(primary: red, surface: panel), useMaterial3: true), home: const HomeScreen());
}
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.width = 150});
  final double width;
  @override Widget build(BuildContext context) => SvgPicture.asset('assets/degametv-lockup.svg', width: width, fit: BoxFit.contain);
}
class SignInSheet extends StatefulWidget {
  const SignInSheet({super.key});
  @override State<SignInSheet> createState() => _SignInSheetState();
}
class _SignInSheetState extends State<SignInSheet> {
  final email = TextEditingController(); final password = TextEditingController(); bool busy = false; String? error;
  @override void dispose() { email.dispose(); password.dispose(); super.dispose(); }
  Future<void> submit() async { setState(() { busy = true; error = null; }); try { await Supabase.instance.client.auth.signInWithPassword(email: email.text.trim(), password: password.text); if (mounted) Navigator.pop(context); } on AuthException catch (e) { setState(() => error = e.message); } catch (_) { setState(() => error = 'Sign in failed. Please try again.'); } finally { if (mounted) setState(() => busy = false); } }
  @override Widget build(BuildContext context) => Padding(padding: EdgeInsets.only(left: 22, right: 22, top: 24, bottom: MediaQuery.viewInsetsOf(context).bottom + 24), child: Column(mainAxisSize: MainAxisSize.min, children: [const BrandMark(width: 190), const SizedBox(height: 24), TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder())), const SizedBox(height: 12), TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder())), if (error != null) Padding(padding: const EdgeInsets.all(8), child: Text(error!, style: const TextStyle(color: Colors.redAccent))), const SizedBox(height: 12), SizedBox(width: double.infinity, child: FilledButton(onPressed: busy ? null : submit, child: Text(busy ? 'Signing in…' : 'Sign in')))]));
}
