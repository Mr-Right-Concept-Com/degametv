import 'package:material_ui/material_ui.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/home_screen.dart';

const red = Color(0xFFED1C18);
const black = Color(0xFF090909);
const panel = Color(0xFF171717);

class DeGameTVApp extends StatelessWidget {
  const DeGameTVApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'DeGameTV',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: black,
      colorScheme: const ColorScheme.dark(primary: red, surface: panel),
      useMaterial3: true,
      inputDecorationTheme: const InputDecorationTheme(
        filled: true, fillColor: panel, border: OutlineInputBorder(),
      ),
    ),
    home: const HomeScreen(),
  );
}

class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.width = 150});
  final double width;
  @override
  Widget build(BuildContext context) => SvgPicture.asset(
    'assets/degametv-lockup.svg', width: width, fit: BoxFit.contain,
  );
}

class SignInSheet extends StatefulWidget {
  const SignInSheet({super.key});
  @override State<SignInSheet> createState() => _SignInSheetState();
}

class _SignInSheetState extends State<SignInSheet> {
  final email = TextEditingController();
  final password = TextEditingController();
  final name = TextEditingController();
  bool busy = false;
  bool creating = false;
  bool resetMode = false;
  String? error;
  String? success;

  @override
  void dispose() { email.dispose(); password.dispose(); name.dispose(); super.dispose(); }

  Future<void> submit() async {
    setState(() { busy = true; error = null; success = null; });
    try {
      final auth = Supabase.instance.client.auth;
      if (resetMode) {
        await auth.resetPasswordForEmail(email.text.trim());
        setState(() => success = 'Password reset instructions sent if this email is registered.');
      } else if (creating) {
        await auth.signUp(
          email: email.text.trim(),
          password: password.text,
          data: {'full_name': name.text.trim()},
        );
        setState(() => success = 'Account created. Check your email if confirmation is enabled.');
      } else {
        await auth.signInWithPassword(email: email.text.trim(), password: password.text);
        if (mounted) Navigator.pop(context);
      }
    } on AuthException catch (e) {
      setState(() => error = e.message);
    } catch (_) {
      setState(() => error = 'The request failed. Check your connection and try again.');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    child: Padding(
      padding: EdgeInsets.only(
        left: 22, right: 22, top: 24,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 24,
      ),
      child: SingleChildScrollView(child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const BrandMark(width: 190),
          const SizedBox(height: 24),
          Text(
            resetMode ? 'Reset your password' : creating ? 'Create your account' : 'Welcome back',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 18),
          if (creating && !resetMode) ...[
            TextField(controller: name, textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(labelText: 'Full name')),
            const SizedBox(height: 12),
          ],
          TextField(controller: email, keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            decoration: const InputDecoration(labelText: 'Email address')),
          if (!resetMode) ...[
            const SizedBox(height: 12),
            TextField(controller: password, obscureText: true,
              autofillHints: [creating ? AutofillHints.newPassword : AutofillHints.password],
              decoration: const InputDecoration(labelText: 'Password')),
          ],
          if (error != null) Padding(
            padding: const EdgeInsets.all(10),
            child: Text(error!, style: const TextStyle(color: Colors.redAccent)),
          ),
          if (success != null) Padding(
            padding: const EdgeInsets.all(10),
            child: Text(success!, style: const TextStyle(color: Colors.lightGreenAccent)),
          ),
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, child: FilledButton(
            onPressed: busy ? null : submit,
            child: Text(busy ? 'Please wait…' : resetMode ? 'Send reset email' : creating ? 'Create account' : 'Sign in'),
          )),
          TextButton(
            onPressed: busy ? null : () => setState(() { resetMode = !resetMode; creating = false; error = null; success = null; }),
            child: Text(resetMode ? 'Back to sign in' : 'Forgot password?'),
          ),
          if (!resetMode) TextButton(
            onPressed: busy ? null : () => setState(() { creating = !creating; error = null; success = null; }),
            child: Text(creating ? 'Already have an account? Sign in' : 'New to DeGameTV? Create an account'),
          ),
        ],
      )),
    ),
  );
}