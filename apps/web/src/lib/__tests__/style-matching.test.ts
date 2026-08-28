import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DEMO_PRODUCTS } from "@/data/demo-products";
import {
  analyzePixelSample,
  recommendProducts,
  recommendationReason,
  suggestSectionFromSource,
  validatePhotoFile,
  type StyleAnalysis,
} from "@/lib/style-matching";

function pixels(red: number, green: number, blue: number, alpha = 255) {
  const data = new Uint8ClampedArray(64);
  for (let index = 0; index < data.length; index += 16) {
    data[index] = red;
    data[index + 1] = green;
    data[index + 2] = blue;
    data[index + 3] = alpha;
  }
  return { data };
}

const WOMENS_ANALYSIS: StyleAnalysis = {
  color: "black",
  tone: "deep",
  style: "formal",
  suggestedSection: "womens",
  sectionConfidence: "high",
  sectionReason: "Explicit section cue.",
};

describe("local image analysis", () => {
  test("detects broad colour and tone characteristics", () => {
    assert.deepEqual(analyzePixelSample(pixels(245, 245, 245)), { color: "white", tone: "light" });
    assert.deepEqual(analyzePixelSample(pixels(20, 20, 20)), { color: "black", tone: "deep" });
    assert.deepEqual(analyzePixelSample(pixels(30, 60, 180)), { color: "blue", tone: "balanced" });
  });

  test("rejects images without visible pixels", () => {
    assert.throws(() => analyzePixelSample(pixels(0, 0, 0, 0)), /No visible pixels/);
  });

  test("validates supported file types and the local upload size limit", () => {
    assert.equal(validatePhotoFile({ type: "image/jpeg", size: 2_000_000 }), null);
    assert.equal(validatePhotoFile({ type: "text/plain", size: 100 }), "Choose a JPG, PNG, or WebP image.");
    assert.equal(
      validatePhotoFile({ type: "image/png", size: 7 * 1024 * 1024 }),
      "That image is over 6 MB. Choose a smaller photo.",
    );
  });

  test("uses explicit image-name section cues conservatively", () => {
    assert.equal(suggestSectionFromSource("woman-portrait.jpg").suggestedSection, "womens");
    assert.equal(suggestSectionFromSource("male-fashion.webp").suggestedSection, "mens");
    const uncertain = suggestSectionFromSource("IMG_1024.JPG");
    assert.equal(uncertain.suggestedSection, "unisex");
    assert.equal(uncertain.sectionConfidence, "low");
  });
});

describe("recommendation ranking", () => {
  test("automatic women's matching returns only women's products", () => {
    const results = recommendProducts(DEMO_PRODUCTS, WOMENS_ANALYSIS, "auto", "formal");
    assert.equal(results.length, 6);
    assert.ok(results.every(({ product }) => product.gender === "womens"));
  });

  test("a manual section override is always strict", () => {
    const results = recommendProducts(DEMO_PRODUCTS, WOMENS_ANALYSIS, "mens", "formal");
    assert.ok(results.length > 0);
    assert.ok(results.every(({ product }) => product.gender === "mens"));
  });

  test("an uncertain automatic result safely returns unisex products only", () => {
    const uncertain: StyleAnalysis = {
      ...WOMENS_ANALYSIS,
      suggestedSection: "unisex",
      sectionConfidence: "low",
    };
    const results = recommendProducts(DEMO_PRODUCTS, uncertain, "auto", "casual");
    assert.ok(results.length > 0);
    assert.ok(results.every(({ product }) => product.gender === "unisex"));
  });

  test("exact occasion and colour matches rank ahead of weaker matches", () => {
    const results = recommendProducts(DEMO_PRODUCTS, WOMENS_ANALYSIS, "auto", "formal", 30);
    assert.ok(results[0].score >= results.at(-1)!.score);
    assert.ok(results.slice(0, 3).some(({ product }) => product.style === "formal"));
    assert.ok(results.slice(0, 3).some(({ product }) => product.color === "black"));
    assert.match(recommendationReason(results[0].product, WOMENS_ANALYSIS, "formal"), /match|pairing/);
  });
});
