import { motion } from "framer-motion";
import { Download, ChevronDown, ChevronUp, Store, Calendar, Hash } from "lucide-react";
import { useState } from "react";
import type { ReceiptData } from "@/utils/receipt.functions";

interface ReceiptResultsProps {
  data: ReceiptData;
}

const categoryColors: Record<string, string> = {
  food: "bg-chart-1/20 text-chart-1",
  beverage: "bg-chart-2/20 text-chart-2",
  grocery: "bg-chart-3/20 text-chart-3",
  household: "bg-chart-4/20 text-chart-4",
  health: "bg-chart-5/20 text-chart-5",
  other: "bg-muted-foreground/20 text-muted-foreground",
};

export function ReceiptResults({ data }: ReceiptResultsProps) {
  const [showRawText, setShowRawText] = useState(false);

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${data.date || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const header = "Item,Quantity,Price,Category,Confidence\n";
    const rows = data.items
      .map((i) => `"${i.item}",${i.quantity},${i.price},${i.category || ""},${i.confidence || ""}`)
      .join("\n");
    const totalRow = `\n"TOTAL",,${data.total || ""},,"`;
    const blob = new Blob([header + rows + totalRow], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${data.date || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Meta info */}
      <div className="flex flex-wrap gap-3">
        {data.storeName && (
          <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            <Store className="h-3 w-3" />
            {data.storeName}
          </div>
        )}
        {data.date && (
          <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            <Calendar className="h-3 w-3" />
            {data.date}
          </div>
        )}
        {data.items.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            <Hash className="h-3 w-3" />
            {data.items.length} items
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Qty</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price</th>
              <th className="hidden px-4 py-3 text-center font-medium text-muted-foreground sm:table-cell">Category</th>
              <th className="hidden px-4 py-3 text-center font-medium text-muted-foreground sm:table-cell">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <motion.tr
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border-b border-border/50 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-foreground">{item.item}</td>
                <td className="px-4 py-3 text-center font-mono text-muted-foreground">{item.quantity}</td>
                <td className="px-4 py-3 text-right font-mono text-foreground">
                  {item.price.toFixed(2)}
                </td>
                <td className="hidden px-4 py-3 text-center sm:table-cell">
                  {item.category && (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[item.category] || categoryColors.other}`}>
                      {item.category}
                    </span>
                  )}
                </td>
                <td className="hidden px-4 py-3 text-center sm:table-cell">
                  {item.confidence != null && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total */}
      {data.total != null && (
        <div className="flex items-center justify-between rounded-xl bg-primary/10 px-5 py-4 border border-primary/20">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="text-2xl font-bold text-primary font-mono">
            {data.currency || "$"} {data.total.toFixed(2)}
          </span>
        </div>
      )}

      {/* Raw text toggle */}
      <button
        onClick={() => setShowRawText(!showRawText)}
        className="flex w-full items-center justify-between rounded-lg bg-secondary px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
      >
        <span>Raw OCR Text</span>
        {showRawText ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {showRawText && (
        <motion.pre
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="max-h-60 overflow-auto rounded-lg bg-secondary p-4 font-mono text-xs text-muted-foreground"
        >
          {data.rawText}
        </motion.pre>
      )}

      {/* Download buttons */}
      <div className="flex gap-2">
        <button
          onClick={downloadJSON}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          <Download className="h-4 w-4" />
          Download JSON
        </button>
        <button
          onClick={downloadCSV}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </button>
      </div>
    </motion.div>
  );
}
