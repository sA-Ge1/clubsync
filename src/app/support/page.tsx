"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Fuse from "fuse.js";

const faqs: { question: string; answer: string }[] = [
  {
    question: "What is ClubSync?",
    answer:
      "ClubSync is a platform that helps college clubs manage their inventory, funds, and item requests. It ensures transparency by allowing clubs to track equipment usage, share items with other clubs, and approve or reject student requests with proper department authorization.",
  },
  {
    question: "How does inventory sharing work?",
    answer:
      "Each club maintains an inventory list inside ClubSync. Items can be:\n- Shared with students\n- Lent to other clubs\n- Reserved for events\n\nAll borrowing or lending activities are logged, so clubs always know where their equipment is and who is responsible for it.",
  },
  {
    question: "Why do students need department approval?",
    answer:
      "To prevent misuse of club equipment, all student requests must be approved by their respective department. Once approved, the request is forwarded to the club for final confirmation. This two-step authorization ensures accountability and protects club resources.",
  },
  {
    question: "Can clubs share inventory between each other?",
    answer:
      "Yes. Clubs can directly request items from other clubs through ClubSync. Both clubs receive a clear record of the transaction, and the system tracks when the item is returned to maintain accountability.",
  },
  {
    question: "How do clubs track their funds?",
    answer:
      "ClubSync includes a fund management system where clubs can record expenses, income, event budgets, and reimbursement entries. Everything stays organized so club treasurers and admins can monitor finances without spreadsheets.",
  },
  {
    question: "Does ClubSync generate reports?",
    answer:
      "Yes. Clubs can generate detailed reports on:\n- Inventory usage\n- Student borrowing history\n- Inter-club sharing\n- Fund utilization\n- Expense and income summaries\n\nThese reports make audits and end-of-year reviews much easier.",
  },
  {
    question: "Why can't I see some clubs or items?",
    answer:
      "Some clubs mark their inventory as private or restrict visibility to certain roles. Students only see items available for borrowing. If something seems missing, contact the club admin for clarification.",
  },
  {
    question: "Why was my request rejected?",
    answer:
      "Requests may be rejected due to:\n- Department disapproval\n- Item unavailability\n- Club-level restrictions\n- Incorrect or incomplete request details\n\nYou can view the rejection reason in your request history.",
  },
  {
    question: "Can club admins add or remove items?",
    answer:
      "Yes. Club admins can add inventory items, update stock levels, mark broken items, and remove inactive entries. Only users with admin or lead roles can manage inventory.",
  },
  {
    question: "Who do I contact for technical issues?",
    answer:
      "For bugs, errors, or unexpected behavior, feel free to reach out through the Contact Support page. Sharing screenshots helps us resolve issues quickly.",
  },
];

export default function SupportPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const faqRefs = useRef<(HTMLDivElement | null)[]>([]);

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
          Find answers related to ClubSync inventory management, fund tracking,
          approvals, and general usage. If you need extra help, reach out anytime.
        </p>
      </div>

      {/* General Info */}
      <div className="max-w-3xl w-full mb-12">
        <h2 className="text-xl font-semibold mb-3">About ClubSync</h2>
        <p className="text-muted-foreground">
          ClubSync is built to simplify how college clubs manage and share
          inventory. Clubs can track all equipment, lend items to members or other
          clubs, and maintain a clean borrowing history. Students can request
          inventory, but their requests are only processed once their department
          approves them, ensuring proper authorization.
          <br />
          <br />
          In addition to inventory management, ClubSync helps clubs keep track of
          their financial activities. Expense logs, fund updates, and transaction
          history are all stored in one place, making budgeting and audits much
          easier.
          <br />
          <br />
          <b>Note:</b> ClubSync does not influence club or department decisions.
          Approvals and permissions are fully handled by the respective clubs and
          authorities.
        </p>
      </div>

      {/* Search Bar */}
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
        ) : (
          query && (
            <p className="absolute top-full mt-5 left-0 right-0 bg-background text-foreground border rounded-lg shadow-lg z-10 px-4 py-2">
              No results found
            </p>
          )
        )}
      </div>

      {query && (
        <div
          className="fixed inset-0 bg-background/50 backdrop-blur-sm z-5"
          onClick={() => setQuery("")}
        ></div>
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

      {/* Contact Support */}
      <div className="max-w-3xl w-full text-center">
        <p className="text-muted-foreground mb-5">
          Didn’t find the answer you were looking for?
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
