import OrderForm from "./OrderForm";

export default function Home() {
  return (
    <main className="flex flex-1 justify-center px-4 py-10">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-zinc-900">Send us your file to print</h1>
          <p className="text-sm text-zinc-500">
            Upload a PDF or photo, pick your options, and see the price instantly.
          </p>
        </div>
        <OrderForm />
      </div>
    </main>
  );
}
