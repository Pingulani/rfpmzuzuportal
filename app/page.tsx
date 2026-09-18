import MemberSearchBar from '../components/check-in/MemberSearchBar';
import LiveHeadcount from '../components/check-in/LiveHeadcount';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center py-12 px-4">
      <h1 className="text-3xl font-black text-red-900 mb-8 tracking-wider uppercase">
        RFP Mzuzu Portal
      </h1>
      
      <LiveHeadcount />
      <MemberSearchBar />
      
    </main>
  );
}