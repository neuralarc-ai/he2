'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from 'next/link';

export const legalContent = {
  terms: {
    title: "Terms of Use",
    content: (
      <div className="space-y-4">
        <p>
          Welcome to Helium. By accessing or using
          https://he2.ai (the "Platform"), you agree to be bound
          by these Terms of Use. If you do not agree, please do not use the
          Platform.
        </p>
        <div>
          <h3 className="font-semibold">Use of Platform</h3>
          <p>
            The Platform is provided for informational and experimental
            purposes only. You agree to use it in compliance with all
            applicable laws and regulations.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">User Content</h3>
          <p>
            You are responsible for any content you input or generate using the
            Platform. Do not submit unlawful, harmful, or infringing content.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Intellectual Property</h3>
          <p>
            All content, trademarks, and intellectual property on the Platform
            are owned by Helium and its licensors. You may not copy,
            reproduce, or distribute any part of the Platform without
            permission.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Disclaimer of Warranties</h3>
          <p>
            The Platform is provided "as is" without warranties of any kind. We
            do not guarantee the accuracy, completeness, or reliability of any
            content or output.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Limitation of Liability</h3>
          <p>
            We are not liable for any damages arising from your use of the
            Platform, including direct, indirect, incidental, or consequential
            damages.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Changes to Terms</h3>
          <p>
            We may update these Terms of Use at any time. Continued use of the
            Platform constitutes acceptance of the revised terms.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Contact</h3>
          <p>
            For questions, contact us at: {" "}
            <a
              href="mailto:support@neuralarc.ai"
              className="text-blue-600 hover:underline"
            >
              support@neuralarc.ai
            </a>
          </p>
        </div>
        <p className="text-sm text-gray-500 pt-4 border-t border-gray-200">
          Last updated: May, 2025
        </p>
      </div>
    ),
  },
  privacy: {
    title: "Privacy Policy",
    content: (
      <div className="space-y-4">
        <p>
          This Privacy Policy describes how Helium ("we", "our", or "us") collects, uses, and shares your information when you use our platform.
        </p>
        <div>
          <h3 className="font-semibold">Information We Collect</h3>
          <p>
            We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">How We Use Your Information</h3>
          <p>
            We use the information we collect to provide, maintain, and improve our services, communicate with you, and ensure security.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Information Sharing</h3>
          <p>
            We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Data Security</h3>
          <p>
            We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Your Rights</h3>
          <p>
            You have the right to access, correct, or delete your personal information. Contact us to exercise these rights.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Contact</h3>
          <p>
            For privacy-related questions, contact us at: {" "}
            <a
              href="mailto:privacy@neuralarc.ai"
              className="text-blue-600 hover:underline"
            >
              privacy@neuralarc.ai
            </a>
          </p>
        </div>
        <p className="text-sm text-gray-500 pt-4 border-t border-gray-200">
          Last updated: May, 2025
        </p>
      </div>
    ),
  },
  "responsible-ai": {
    title: "Responsible & Ethical AI Policies",
    content: (
      <div className="space-y-4">
        <h3 className="font-semibold text-xl">Responsible AI & Disclaimer</h3>
        <p>
          We are committed to developing and deploying AI responsibly. AI
          technologies hosted on https://he2.ai are designed to
          augment human decision-making, not replace it.
        </p>
        <div>
          <h4 className="font-semibold text-lg">Our Principles</h4>
          <div className="pl-4 mt-2 space-y-3">
            <div>
              <h5 className="font-semibold">Transparency</h5>
              <ul className="list-disc list-inside pl-4">
                <li>Clear communication when users are interacting with AI.</li>
                <li>
                  Explanation of how results are generated wherever feasible.
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Human Oversight</h5>
              <ul className="list-disc list-inside pl-4">
                <li>
                  AI suggestions or outputs should be reviewed by a qualified
                  human.
                </li>
                <li>
                  Critical or sensitive decisions (e.g., legal or health
                  matters) must not be made solely based on AI output.
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Robustness and Safety</h5>
              <ul className="list-disc list-inside pl-4">
                <li>
                  We test AI systems to identify and minimize errors and
                  unintended consequences.
                </li>
                <li>
                  Feedback mechanisms are built to report inappropriate or
                  harmful behavior.
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Privacy-Aware Design</h5>
              <ul className="list-disc list-inside pl-4">
                <li>Minimal collection of personal data.</li>
                <li>Short-term retention of user inputs (only if necessary).</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Purpose Limitation</h5>
              <p>
                AI tools are deployed only for clearly defined, ethical, and
                socially beneficial use cases.
              </p>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-lg">Ethical AI Guidelines</h4>
          <p>
            We believe AI should benefit all users and be governed by
            principles that uphold fairness, accountability, and human dignity.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-lg">Key Values</h4>
          <div className="pl-4 mt-2 space-y-3">
            <div>
              <h5 className="font-semibold">Fairness & Non-Discrimination</h5>
              <ul className="list-disc list-inside pl-4">
                <li>
                  Our AI models are evaluated to reduce bias and promote
                  inclusive use.
                </li>
                <li>
                  Discriminatory or harmful content generation is actively
                  monitored and filtered.
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Accountability</h5>
              <ul className="list-disc list-inside pl-4">
                <li>
                  We accept responsibility for the behavior and consequences of
                  our AI systems.
                </li>
                <li>
                  We encourage users to report concerns via {" "}
                  <a
                    href="mailto:support@neuralarc.ai"
                    className="text-blue-600 hover:underline"
                  >
                    support@neuralarc.ai
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Autonomy</h5>
              <ul className="list-disc list-inside pl-4">
                <li>
                  Users are empowered to understand and control their
                  interaction with AI.
                </li>
                <li>AI should never manipulate, coerce, or deceive.</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Do No Harm</h5>
              <ul className="list-disc list-inside pl-4">
                <li>
                  We design AI tools with safeguards to prevent misuse, harm, or
                  exploitation.
                </li>
                <li>Malicious use of AI tools is prohibited.</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold">Accessibility</h5>
              <p>
                We strive to make the Platform accessible and usable by people
                of all backgrounds and abilities.
              </p>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500 pt-4 border-t border-gray-200">
          Last updated: May, 2025
        </p>
      </div>
    ),
  },
};

type LegalTopic = keyof typeof legalContent;

export default function LoginFooter() {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState<LegalTopic | null>(null);

  const openDialog = (topic: LegalTopic) => {
    setActiveTopic(topic);
    setDialogOpen(true);
  };

  const LinkButton = ({
    topic,
    children,
  }: {
    topic: LegalTopic;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => openDialog(topic)}
      className="hover:underline flex-shrink-0 cursor-pointer"
    >
      {children}
    </button>
  );

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.6, 
          ease: [0.4, 0, 0.2, 1],
          delay: 1.6
        }}
        className="fixed bottom-4 left-0 right-0 mx-auto w-full px-4 flex flex-row flex-wrap justify-center items-center gap-x-1 gap-y-2 text-xs text-muted-foreground z-20 text-center dark:text-white"
      >
        <LinkButton topic="terms">Terms of use</LinkButton>
        <div className="flex items-center"><span className="mx-1">•</span><LinkButton topic="privacy">Privacy Policy</LinkButton></div>
        <div className="flex items-center"><span className="mx-1">•</span><LinkButton topic="responsible-ai">Responsible &amp; Ethical AI</LinkButton></div>
        <div className="flex items-center flex-shrink-0"><span className="mx-1">•</span><span>Copyright 2025. All rights reserved.</span></div>
        <div className="flex items-center flex-shrink-0"><span className="mx-1">•</span><span>Helium, a product by <Link href="https://neuralarc.ai" className="font-bold hover:underline" target="_blank" rel="noopener noreferrer">NeuralArc</Link></span></div>
      </motion.div>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-background text-foreground">
          {activeTopic && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  {legalContent[activeTopic].title}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
                {legalContent[activeTopic].content}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
