import { Sidebar } from '../components/Sidebar';
import { AnnotationForm } from '../components/AnnotationForm';

export default function Home() {
  return (
    <main className="flex flex-col md:flex-row min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />
      <AnnotationForm />
    </main>
  );
}