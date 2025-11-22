"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Fuse from "fuse.js";

const faqs: { question: string; answer: string }[] = [
  {
    question: "What is Report Gen?",
    answer:
      "Report Gen is an online platform designed to simplify the process of creating, customizing, and managing reports. It integrates directly with Google Drive, supports placeholder replacement and downloading the formatted document. Instead of spending hours formatting and filling details, Report Gen automatically structures your reports with the necessary key information — saving both time and effort.",
  },
  {
    question: "Do I need an account to use Report Gen?",
    answer:
      "Yes, an account is required to use Report Gen. You can sign in either with Google Sign-In or with your email credentials. Role-based access ensures that only authorized users can perform specific actions, such as editing templates or managing folders. This provides both flexibility and security within teams.",
  },
  {
    question: "What are tokens? How do they work?",
    answer:
      "Tokens are the credits used to generate documents within Report Gen. Creating one document requires one token. Tokens are not subscription-based — once purchased, they remain in your account until you use them. They never expire, so you can use them at any time.",
  },
  {
    question: "How do I buy new tokens?",
    answer:
      "You can purchase token packs directly through your account dashboard. Payments are processed securely via Razorpay, ensuring safe and quick transactions. Once your payment is confirmed, the tokens will be credited to your account immediately.",
  },
  {
    question: "Why aren’t documents being generated?",
    answer:
      "If your document is not being generated, it could be due to temporary server downtime or high traffic. You can check the server status by clicking on the Report Gen logo, which will start a request to the backend. If the server is starting up, please allow a few minutes and try again.",
  },
  {
    question: "How can I modify the templates or add new ones?",
    answer:
      "To edit existing templates, you must have at least the Editor role. Due to security and quality concerns, not every user is granted Editor access by default. You can request Editor access through the contact page. Once approved, you can modify templates or add new ones without limitation.",
  },
  {
    question: "I purchased tokens but did not receive them. What should I do?",
    answer:
      "In most cases, tokens are credited to your account almost instantly after a successful payment. If you have been charged but tokens are not visible in your account, please reach out to our support team. We will verify your transaction and ensure the tokens are credited as quickly as possible.",
  },
  {
    question: "Can I get a refund for my tokens?",
    answer:
      "Tokens are generally non-refundable. However, in rare cases where tokens were purchased by mistake and none have been used, we may consider a refund at our sole discretion. Please contact our support team with your transaction details, and we will review your request.",
  },
  {
    question: "Will tokens be used even if document fails to generate?",
    answer: "No, tokens are only used when a document is generated successfully.",
  },
  {
    question:
      "I am getting a 'You do not have access' message on a page. What should I do?",
    answer:
      "Some pages in Report Gen require a minimum role level to access. New users must wait for their accounts to be approved, which usually takes between 24 to 48 hours. In some cases, our team may reach out to you for additional details during this process. \n\nIf your account is already active but you need higher access, please contact support to request a role upgrade. The minimum roles required for different sections are:\n- **Admin role** → Admin pages\n- **Editor role** → Editor pages\n- **Viewer role** → Viewer pages\n- **User role** → Report generation\n\nMake sure your role matches the page you’re trying to access, and reach out if you believe there’s an error with your permissions.",
  },
];

export default function SupportPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  // Refs for each FAQ
  const faqRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Setup fuzzy search
  const fuse = new Fuse(faqs, {
    keys: ["question", "answer"],
    threshold: 0.2,
  });

  const results = query ? fuse.search(query) : [];
  const suggestions = results.map((res) => ({
    ...res.item,
    index: faqs.indexOf(res.item),
  }));

  const handleSuggestionClick = (faqIndex: number) => {
    setOpenIndex(faqIndex);
    setQuery("");
    setTimeout(() => {
      faqRefs.current[faqIndex]?.scrollIntoView({
        behavior: "smooth",
      });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 flex flex-col items-center">
      {/* Header */}
      <div className="max-w-3xl w-full text-center mb-10">
        <h1 className="text-3xl font-bold mb-4">Support & Help</h1>
        <p className="text-muted-foreground">
          Welcome to the Report Gen support center. Find answers to common
          questions, learn more about our platform, and reach out if you need
          extra help.
        </p>
      </div>

      {/* General Info */}
      <div className="max-w-3xl w-full mb-12">
        <h2 className="text-xl font-semibold mb-3">About Report Gen</h2>
        <p className="text-muted-foreground">
          Report Gen is a cloud-based platform that helps users create,
          customize, and manage professional reports with ease. It offers secure
          file management through Google Drive integration, allowing templates
          and generated reports to be stored safely in the cloud.
          <br />
          <br />
          The core feature of Report Gen is its template-driven document
          generation. For example, doctors who maintain handwritten records of a
          patient’s basic information can feed this data into Report Gen. The
          platform then automatically matches the appropriate template, fills in
          the details, and generates a ready-to-download report. This saves
          time, reduces manual effort, and ensures consistency across documents.
          <br />
          <br />
          <b>Important Notice :</b> Report Gen is not affiliated with any medical
          college, hospital, or healthcare institution. It is a general-purpose
          reporting tool, and users are solely responsible for how the platform
          and its generated reports are used.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-3xl w-full mb-10 z-10">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your question..."
          className="w-full px-4 py-2 border rounded-lg shadow-sm focus:ring focus:ring-indigo-500"
        />

        {query && suggestions.length > 0 ? (
          <ul className="absolute top-full mt-5 left-0 right-0 bg-background text-foreground border rounded-lg shadow-lg z-10">
            {suggestions.slice(0, 5).map((faq, i) => (
              <li
                key={i}
                onClick={() => handleSuggestionClick(faq.index)}
                className="px-4 py-2 cursor-pointer hover:bg-muted"
              >
                {faq.question}
              </li>
            ))}
          </ul>
        ):(query&&(
            <p className="absolute top-full mt-5 left-0 right-0 bg-background text-foreground border rounded-lg shadow-lg z-10 px-4 py-2 cursor-pointer hover:bg-muted">No results found</p>
        ))}
      </div>
      {query && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-5" onClick={()=>setQuery("")}></div>
        )}

      {/* FAQ Section */}
      <div className="max-w-3xl w-full mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              ref={(el) => {
                faqRefs.current[index] = el;
              }}
              className="border rounded-xl bg-background text-card-foreground shadow-sm"
            >
              <button
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
                className="w-full flex justify-between items-center p-4 text-left"
              >
                <span className="font-medium">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-4 pb-4 text-muted-foreground">
                  <ReactMarkdown>{faq.answer}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Link */}
      <div className="max-w-3xl w-full text-center">
        <p className="text-muted-foreground mb-5">
          Didn’t find what you’re looking for?
        </p>
        <Link
          href="/contact"
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
