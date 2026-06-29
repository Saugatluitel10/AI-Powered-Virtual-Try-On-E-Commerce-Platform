"use client";

import { useState } from "react";
import { Code, Key, Webhook, Package, Terminal, Copy, Check, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Tab = "quickstart" | "api" | "sdk" | "embed" | "webhooks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy code"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "quickstart", label: "Quick Start", icon: Terminal },
  { id: "api", label: "REST API", icon: Code },
  { id: "sdk", label: "JavaScript SDK", icon: Package },
  { id: "embed", label: "Embed Widget", icon: ExternalLink },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
];

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState<Tab>("quickstart");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-purple-700 to-indigo-800 text-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Code className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Developer Documentation</h1>
          </div>
          <p className="text-purple-200 text-lg max-w-2xl">
            Integrate AI-powered virtual try-on into your app. Get started in minutes with our REST API, JavaScript SDK, or drop-in embed widget.
          </p>
          <div className="flex gap-3 mt-6">
            <Badge className="bg-white/20 text-white border-0">REST API</Badge>
            <Badge className="bg-white/20 text-white border-0">JavaScript SDK</Badge>
            <Badge className="bg-white/20 text-white border-0">Iframe Embed</Badge>
            <Badge className="bg-white/20 text-white border-0">Webhooks</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <nav className="flex gap-1 border-b mb-8 overflow-x-auto" role="tablist" aria-label="Documentation sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === "quickstart" && (
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">1. Create a Tenant</h2>
              <p className="text-gray-600 mb-4">Sign up and create a tenant to get your API key.</p>
              <CodeBlock code={`curl -X POST ${API_BASE}/tenants \\
  -H "Authorization: Bearer YOUR_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Store", "slug": "my-store"}'

# Response:
# { "data": { "tenant": { "id": "...", "slug": "my-store" }, "apiKey": "vtk_..." } }`} />
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">2. Submit a Try-On</h2>
              <p className="text-gray-600 mb-4">Send a user photo and product ID to generate a virtual try-on.</p>
              <CodeBlock code={`curl -X POST ${API_BASE}/public/tryon \\
  -H "X-API-Key: vtk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "productId": "product_id_here",
    "userPhotoUrl": "https://example.com/photo.jpg"
  }'

# Response:
# { "data": { "jobId": "...", "status": "pending", "pollUrl": "/api/v1/public/tryon/..." } }`} />
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">3. Poll for Result</h2>
              <p className="text-gray-600 mb-4">Poll the status endpoint or use webhooks for real-time delivery.</p>
              <CodeBlock code={`curl ${API_BASE}/public/tryon/JOB_ID \\
  -H "X-API-Key: vtk_your_key_here"

# When complete:
# { "data": { "id": "...", "status": "completed", "resultImageUrl": "https://..." } }`} />
            </section>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Authentication
                </h3>
                <p className="text-purple-800 text-sm">
                  All public API endpoints require an <code className="bg-purple-100 px-1 rounded">X-API-Key</code> header.
                  Create API keys from your tenant dashboard. Keys are scoped — you control which endpoints each key can access.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "api" && (
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-gray-900">REST API Reference</h2>

            {[
              {
                method: "GET",
                path: "/public/products",
                desc: "List products with filtering and pagination",
                params: "page, pageSize, category, gender, tryonOnly",
                scopes: "products:read",
              },
              {
                method: "GET",
                path: "/public/products/:id",
                desc: "Get product details by ID",
                params: "none",
                scopes: "products:read",
              },
              {
                method: "POST",
                path: "/public/tryon",
                desc: "Submit a virtual try-on job",
                params: "productId, userPhotoUrl (body)",
                scopes: "tryon:write",
              },
              {
                method: "GET",
                path: "/public/tryon/:jobId",
                desc: "Poll try-on job status and result",
                params: "none",
                scopes: "tryon:read",
              },
              {
                method: "POST",
                path: "/public/size-recommendation",
                desc: "Get AI size recommendation from measurements",
                params: "productId, bust, waist, hips (body)",
                scopes: "products:read",
              },
            ].map((ep) => (
              <Card key={ep.path}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge className={ep.method === "GET" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                      {ep.method}
                    </Badge>
                    <code className="text-sm font-mono text-gray-900">{ep.path}</code>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{ep.desc}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span><strong>Params:</strong> {ep.params}</span>
                    <span><strong>Scope:</strong> {ep.scopes}</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Rate Limits</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { tier: "Free", limit: "100 req/day" },
                  { tier: "Starter", limit: "5,000 req/day" },
                  { tier: "Growth", limit: "50,000 req/day" },
                  { tier: "Enterprise", limit: "Unlimited" },
                ].map((t) => (
                  <Card key={t.tier}>
                    <CardContent className="p-4 text-center">
                      <p className="font-semibold text-gray-900">{t.tier}</p>
                      <p className="text-sm text-gray-500">{t.limit}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "sdk" && (
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-gray-900">JavaScript SDK</h2>
            <p className="text-gray-600">Install <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">@vtryon/sdk</code> for a typed client with built-in polling.</p>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Installation</h3>
              <CodeBlock code="npm install @vtryon/sdk" />
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Initialize</h3>
              <CodeBlock language="typescript" code={`import { VTryonSDK } from "@vtryon/sdk";

const vtryon = new VTryonSDK({
  apiKey: "vtk_your_key_here",
  baseUrl: "${API_BASE}",
});`} />
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">List Products</h3>
              <CodeBlock language="typescript" code={`const products = await vtryon.listProducts({
  category: "dresses",
  tryonOnly: true,
  page: 1,
  pageSize: 20,
});

console.log(products.items); // Product[]`} />
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Submit Try-On with Auto-Polling</h3>
              <CodeBlock language="typescript" code={`const result = await vtryon.tryOn({
  productId: "prod_abc123",
  userPhotoUrl: "https://example.com/photo.jpg",
});

// SDK polls automatically until complete
console.log(result.status);         // "completed"
console.log(result.resultImageUrl); // "https://..."`} />
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Size Recommendation</h3>
              <CodeBlock language="typescript" code={`const rec = await vtryon.sizeRecommendation({
  productId: "prod_abc123",
  bust: 88,
  waist: 72,
  hips: 96,
});

console.log(rec.size);       // "M"
console.log(rec.confidence); // 0.87`} />
            </section>
          </div>
        )}

        {activeTab === "embed" && (
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-gray-900">Embed Widget</h2>
            <p className="text-gray-600">
              Drop a try-on button into any website with <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">@vtryon/embed</code> — no framework required.
            </p>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Script Tag (Simplest)</h3>
              <CodeBlock language="html" code={`<script src="https://cdn.vtryon.com/embed.js"></script>
<div
  id="vtryon-widget"
  data-api-key="vtk_your_key_here"
  data-product-id="prod_abc123"
  data-theme="light"
></div>
<script>
  VTryonEmbed.init("#vtryon-widget");
</script>`} />
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">NPM Package</h3>
              <CodeBlock code="npm install @vtryon/embed" />
              <div className="mt-4">
                <CodeBlock language="typescript" code={`import { VTryonEmbed } from "@vtryon/embed";

const widget = new VTryonEmbed({
  container: "#vtryon-widget",
  apiKey: "vtk_your_key_here",
  productId: "prod_abc123",
  theme: "light",
  onResult: (result) => {
    console.log("Try-on complete:", result.resultImageUrl);
  },
});`} />
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Configuration</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border" role="table">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="p-3 font-medium border-b">Option</th>
                      <th className="p-3 font-medium border-b">Type</th>
                      <th className="p-3 font-medium border-b">Default</th>
                      <th className="p-3 font-medium border-b">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["apiKey", "string", "required", "Your VTryon API key"],
                      ["productId", "string", "required", "Product to try on"],
                      ["theme", '"light" | "dark"', '"light"', "Widget color scheme"],
                      ["locale", '"en" | "ne"', '"en"', "UI language"],
                      ["onResult", "function", "undefined", "Callback when try-on completes"],
                    ].map(([opt, type, def, desc]) => (
                      <tr key={opt} className="border-b">
                        <td className="p-3 font-mono text-xs">{opt}</td>
                        <td className="p-3 text-gray-600">{type}</td>
                        <td className="p-3 text-gray-500">{def}</td>
                        <td className="p-3 text-gray-600">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeTab === "webhooks" && (
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-gray-900">Webhooks</h2>
            <p className="text-gray-600">
              Receive real-time notifications when try-on jobs complete instead of polling.
            </p>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Register a Webhook</h3>
              <CodeBlock code={`curl -X PUT ${API_BASE}/tenants/my-store/webhook \\
  -H "Authorization: Bearer YOUR_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://yoursite.com/webhooks/vtryon"}'

# Response:
# { "data": { "webhookUrl": "https://...", "webhookSecret": "abc123..." } }`} />
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Event Payload</h3>
              <p className="text-gray-600 mb-3">VTryon sends a POST to your URL with HMAC-SHA256 signature verification.</p>
              <CodeBlock language="json" code={`{
  "event": "tryon.completed",
  "data": {
    "jobId": "clx...",
    "status": "completed",
    "resultImageUrl": "https://storage.vtryon.com/results/...",
    "processingTimeMs": 12340
  },
  "timestamp": "2026-06-29T10:30:00.000Z"
}`} />
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Verify Signature</h3>
              <CodeBlock language="typescript" code={`import crypto from "crypto";

function verifyWebhook(body: string, signature: string, secret: string): boolean {
  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// In your Express handler:
app.post("/webhooks/vtryon", express.text({ type: "*/*" }), (req, res) => {
  const sig = req.headers["x-vtryon-signature"] as string;
  if (!verifyWebhook(req.body, sig, WEBHOOK_SECRET)) {
    return res.status(401).send("Invalid signature");
  }

  const event = JSON.parse(req.body);
  // Handle event...
  res.status(200).send("ok");
});`} />
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Events</h3>
              <div className="space-y-3">
                {[
                  { event: "tryon.completed", desc: "Try-on job finished successfully" },
                  { event: "tryon.failed", desc: "Try-on job failed (timeout or processing error)" },
                  { event: "test.ping", desc: "Test event sent from the dashboard" },
                ].map((e) => (
                  <Card key={e.event}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <code className="text-sm font-mono text-purple-600 bg-purple-50 px-2 py-1 rounded">{e.event}</code>
                      <span className="text-sm text-gray-600">{e.desc}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-amber-900 mb-2">Retry Policy</h3>
                <p className="text-amber-800 text-sm">
                  Failed deliveries are retried up to 3 times with exponential backoff (0s, 5s, 30s).
                  All delivery attempts are logged and visible in your tenant dashboard.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
