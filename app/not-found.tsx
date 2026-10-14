import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NotFoundContent from "@/components/site/NotFoundContent";

// Unmatched URLs render under the bare root layout, so add the site chrome here.
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main">
        <NotFoundContent />
      </main>
      <Footer />
    </>
  );
}
