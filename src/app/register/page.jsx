import AuthLayout from '@/components/AuthModal';
import GlassCard from '@/components/GlassCard';
import Label from '@/components/ui/Label';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Buat akun baru."
      subtitle="Mulai kelola proyek Anda dengan antarmuka yang bersih dan nyaman."
      withSpline
    >
      <GlassCard className="w-full md:w-[480px] justify-self-end">
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input id="name" name="name" placeholder="Nama Anda" />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" placeholder="username" />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="nama@domain.com" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" />
            </div>
            <div>
              <Label htmlFor="confirm">Konfirmasi Password</Label>
              <Input id="confirm" name="confirm" type="password" placeholder="••••••••" />
            </div>
          </div>

          <Button className="w-full mt-2">Daftar</Button>
        </form>

        <p className="text-center text-sm text-white/70 mt-6">
          Sudah punya akun?&nbsp;
          <a className="text-white hover:underline" href="/login">Masuk</a>
        </p>
      </GlassCard>
    </AuthLayout>
  );
}
