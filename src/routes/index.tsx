import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ScanLine, Zap, Table2, Brain } from "lucide-react";
import { ReceiptUploader } from "@/components/ReceiptUploader";
import { ReceiptResults } from "@/components/ReceiptResults";
import { extractReceipt } from "@/utils/receipt.functions";
import type { ReceiptData } from "@/utils/receipt.functions";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Smart Receipt Scanner — AI-Powered Item Extraction" },
      { name: "description", content: "Upload or capture a receipt image and automatically extract items, prices, quantities, and totals using AI-powered OCR." },
    ],
  }),
});

function Index() {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageReady = async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    setError(null);
    setReceiptData(null);
    try {
      const result = await extractReceipt({ data: { imageBase64: base64, mimeType } });
      setReceiptData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process receipt.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-glow">
            <ScanLine className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Smart Receipt Scanner</h1>
            <p className="text-xs text-muted-foreground">AI-powered extraction system</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* Features */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Brain, label: "AI Vision OCR", desc: "Deep learning extraction" },
            { icon: Table2, label: "Structured Data", desc: "Items, prices, totals" },
            { icon: Zap, label: "Instant Results", desc: "Process in seconds" },
          ].map(({ icon: Icon, label, desc }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-xl p-4 text-center"
            >
              <Icon className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-2 text-xs font-semibold text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Upload section */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Upload Receipt
          </h2>
          <ReceiptUploader onImageReady={handleImageReady} isProcessing={isProcessing} />
        </section>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}

        {/* Results */}
        {receiptData && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Extracted Data
            </h2>
            <ReceiptResults data={receiptData} />
          </section>
        )}

        {/* Empty state */}
        {!receiptData && !isProcessing && !error && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Upload a receipt image to get started
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
