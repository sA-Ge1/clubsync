"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MapPin, Send, CheckCircle, AlertCircle, Globe } from "lucide-react";
import { toast } from "sonner";
export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Message sent successfully!", {
          description: "We'll get back to you soon!",
          icon: <CheckCircle className="h-4 w-4" />,
        });
        setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      } else throw new Error("Failed to send message");
    } catch {
      toast.error("Failed to send message", {
        description: "Please try again or contact directly.",
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] w-full bg-gradient-to-br from-background to-[#62828c]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center pt-10 mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-4">
            Get in <span className="text-primary">Touch</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 mb-10 p-5">
          {/* Contact Information */}
          <div>
          <Card className="h-auto backdrop-blur-lg bg-white/5 dark:bg-black/20 shadow-xl border border-white/20">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-semibold">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                {
                  icon: <Mail className="h-6 w-6 text-primary" />,
                  title: "Email",
                  details: ["reportgenemail@gmail.com", "adityakarumbaiah@gmail.com"],
                },
                {
                  icon: <MapPin className="h-6 w-6 text-primary" />,
                  title: "Location",
                  details: ["Bangalore, India"],
                },
                {
                  icon: <Globe className="h-6 w-6 text-primary" />,
                  title: "Website",
                  details: ["https://adityakarumbaiah.vercel.app"],
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start space-x-4 group hover:scale-102 transition-all duration-500">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    {item.details.map((d, j) => {
                      const isLink = d.startsWith("http") || d.includes("@");
                      return isLink ? (
                        <a
                          key={j}
                          href={d.includes("@") ? `mailto:${d}` : d}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-muted-foreground group-hover:text-primary transition-colors underline underline-offset-4 break-words"
                        >
                          {d}
                        </a>
                      ) : (
                        <p key={j} className="text-muted-foreground break-words">{d}</p>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          </div>


          {/* Contact Form */}
          <Card className="backdrop-blur-lg bg-white/5 dark:bg-black/20 shadow-2xl border border-white/20">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl font-semibold">Send a Message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    id="name"
                    name="name"
                    placeholder="Full Name *"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="h-12 w-full"
                  />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Email Address *"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="h-12 w-full"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Phone (optional)"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="h-12 w-full"
                  />
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="Subject *"
                    required
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="h-12 w-full"
                  />
                </div>

                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Your message..."
                  className="w-full px-4 py-3 border border-input bg-transparent rounded-xl text-base shadow-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-primary/40 resize-none"
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
