"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Check,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Heart,
  Activity,
  Baby,
  Users,
  Stethoscope,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface HealthCheckStepperProps {
  clientName: string;
  initialData?: {
    responses?: Record<string, boolean>;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  } | null;
  onComplete: () => void;
  className?: string;
}

const HEALTH_QUESTIONS = {
  cardiovascular: {
    title: "Heart & Cardiovascular",
    icon: Heart,
    questions: [
      {
        key: "heart",
        question: "Has your doctor ever said you have a heart condition?",
        subtext: "Including high blood pressure, angina, or heart attack",
      },
      {
        key: "chest",
        question: "Do you feel pain in your chest when you do physical activity?",
        subtext: "Any chest discomfort during or after exercise",
      },
    ],
  },
  physical: {
    title: "Balance & Physical",
    icon: Activity,
    questions: [
      {
        key: "dizzy",
        question: "Do you lose your balance due to dizziness or lose consciousness?",
        subtext: "Includes feeling faint or lightheaded",
      },
      {
        key: "injuries",
        question: "Do you have any injuries or conditions affecting exercise?",
        subtext: "Such as joint, bone, or muscle problems",
      },
    ],
  },
  medical: {
    title: "Medical Conditions",
    icon: Stethoscope,
    questions: [
      {
        key: "chronic",
        question: "Do you have a chronic condition (e.g., asthma, diabetes, arthritis)?",
        subtext: "Any ongoing medical condition",
      },
      {
        key: "medications",
        question: "Do you take any medications we should be aware of?",
        subtext: "Including prescription and regular supplements",
      },
    ],
  },
  special: {
    title: "Special Considerations",
    icon: Baby,
    questions: [
      {
        key: "pregnant",
        question: "Are you currently pregnant or recently postnatal?",
        subtext: "Or planning pregnancy",
      },
    ],
  },
};

type StepType = "welcome" | "emergency" | keyof typeof HEALTH_QUESTIONS | "review";

const containerVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    x: -50,
    transition: { duration: 0.3, ease: "easeIn" as const },
  },
};

export default function HealthCheckStepper({
  clientName,
  initialData,
  onComplete,
  className = "",
}: HealthCheckStepperProps) {
  const [currentStep, setCurrentStep] = useState<StepType>("welcome");
  const [answers, setAnswers] = useState<Record<string, boolean>>({
    heart: initialData?.responses?.heart ?? false,
    chest: initialData?.responses?.chest ?? false,
    dizzy: initialData?.responses?.dizzy ?? false,
    chronic: initialData?.responses?.chronic ?? false,
    pregnant: initialData?.responses?.pregnant ?? false,
    medications: initialData?.responses?.medications ?? false,
    injuries: initialData?.responses?.injuries ?? false,
  });
  const [emergencyContact, setEmergencyContact] = useState({
    name: initialData?.emergency_contact_name || "",
    phone: initialData?.emergency_contact_phone || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRiskWarning, setShowRiskWarning] = useState(false);

  const steps: StepType[] = [
    "welcome",
    "emergency",
    "cardiovascular",
    "physical",
    "medical",
    "special",
    "review",
  ];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const hasYesAnswers = Object.values(answers).some((answer: boolean) => answer);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleAnswerChange = (key: string, value: boolean) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const canProceedFromEmergency =
    emergencyContact.name.trim() !== "" && emergencyContact.phone.trim() !== "";

  const handleSubmit = async () => {
    if (hasYesAnswers && !showRiskWarning) {
      setShowRiskWarning(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/client/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: answers,
          emergency_contact_name: emergencyContact.name.trim(),
          emergency_contact_phone: emergencyContact.phone.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to submit health check");
      }

      onComplete();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit health check. Please try again.";
      console.error("Failed to submit health check:", error);
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={className}>
      {/* Header with Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl border border-gray-200 dark:border-gray-700 border-b-0 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-wondrous-blue to-wondrous-magenta rounded-xl shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Health & Safety Check
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Step {currentStepIndex + 1} of {steps.length} — Takes 2 minutes
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-wondrous-blue to-wondrous-magenta rounded-full shadow-md"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-gray-800/50 dark:via-gray-800/30 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 border-t-0 rounded-b-2xl p-6 md:p-8 min-h-[500px] flex flex-col">
        <AnimatePresence mode="wait">
          {/* Welcome Step */}
          {currentStep === "welcome" && (
            <motion.div
              key="welcome"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex-1 flex flex-col justify-between"
            >
              <div className="text-center max-w-2xl mx-auto">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-24 h-24 bg-gradient-to-br from-wondrous-blue to-wondrous-magenta rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"
                >
                  <ClipboardCheck className="w-12 h-12 text-white" />
                </motion.div>

                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Welcome, {clientName}!
                </h3>
                <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  Before your first session, we need to complete a quick health screening.
                  This helps us ensure your safety and provide the best experience.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
                  <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-wondrous-blue mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Quick & Easy</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Just 7 simple questions</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-wondrous-blue mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">100% Confidential</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Shared only with your trainer</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                    <div className="flex items-start gap-3">
                      <Activity className="w-5 h-5 text-wondrous-blue mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Safety First</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Ensures appropriate guidance</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-wondrous-blue mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">One Time Setup</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Valid for 6 months</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-wondrous-blue to-wondrous-magenta text-white font-semibold py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Let&apos;s Get Started
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Emergency Contact Step */}
          {currentStep === "emergency" && (
            <motion.div
              key="emergency"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex-1 flex flex-col justify-between"
            >
              <div className="max-w-xl mx-auto w-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-wondrous-blue to-wondrous-magenta rounded-xl shadow-md">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Emergency Contact</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Someone we can contact in case of an emergency
                    </p>
                  </div>
                </div>

                <div className="space-y-5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-6 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                  <div>
                    <Label
                      htmlFor="emergency-name"
                      className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2"
                    >
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <input
                      id="emergency-name"
                      type="text"
                      value={emergencyContact.name}
                      onChange={(e) =>
                        setEmergencyContact((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="e.g., Jane Doe"
                      className="mt-1 w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-wondrous-blue focus:border-wondrous-blue transition-all"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="emergency-phone"
                      className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2"
                    >
                      Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <input
                      id="emergency-phone"
                      type="tel"
                      value={emergencyContact.phone}
                      onChange={(e) =>
                        setEmergencyContact((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="e.g., +44 7700 900000"
                      className="mt-1 w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-wondrous-blue focus:border-wondrous-blue transition-all"
                    />
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mt-4">
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        This information is kept strictly confidential and only used in emergency
                        situations during your session.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="w-full py-6 text-base font-semibold rounded-xl border-2"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceedFromEmergency}
                  className="w-full bg-gradient-to-r from-wondrous-blue to-wondrous-magenta text-white font-semibold py-6 text-base rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Health Question Steps */}
          {(currentStep === "cardiovascular" ||
            currentStep === "physical" ||
            currentStep === "medical" ||
            currentStep === "special") && (
            <motion.div
              key={currentStep}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex-1 flex flex-col justify-between"
            >
              <div className="max-w-2xl mx-auto w-full">
                {(() => {
                  const category = HEALTH_QUESTIONS[currentStep];
                  const Icon = category.icon;

                  return (
                    <>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-gradient-to-br from-wondrous-blue to-wondrous-magenta rounded-xl shadow-md">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{category.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Please answer honestly</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {category.questions.map((item) => (
                          <div
                            key={item.key}
                            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm"
                          >
                            <div className="mb-4">
                              <label className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 block mb-2">
                                {item.question}
                              </label>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{item.subtext}</p>
                            </div>

                            <RadioGroup
                              value={answers[item.key] ? "yes" : "no"}
                              onValueChange={(value) =>
                                handleAnswerChange(item.key, value === "yes")
                              }
                              className="flex gap-3"
                            >
                              <Label
                                htmlFor={`${item.key}-no`}
                                className={`flex-1 flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                  answers[item.key] === false
                                    ? "border-wondrous-blue bg-wondrous-blue/10 shadow-md"
                                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
                                }`}
                              >
                                <RadioGroupItem value="no" id={`${item.key}-no`} className="pointer-events-none" />
                                <span className="ml-3 font-semibold text-gray-900 dark:text-gray-100">
                                  No
                                </span>
                              </Label>

                              <Label
                                htmlFor={`${item.key}-yes`}
                                className={`flex-1 flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                  answers[item.key] === true
                                    ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md"
                                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
                                }`}
                              >
                                <RadioGroupItem value="yes" id={`${item.key}-yes`} className="pointer-events-none" />
                                <span className="ml-3 font-semibold text-gray-900 dark:text-gray-100">
                                  Yes
                                </span>
                              </Label>
                            </RadioGroup>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="w-full py-6 text-base font-semibold rounded-xl border-2"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-wondrous-blue to-wondrous-magenta text-white font-semibold py-6 text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Continue
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Review Step */}
          {currentStep === "review" && (
            <motion.div
              key="review"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex-1 flex flex-col justify-between"
            >
              <div className="max-w-2xl mx-auto w-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-wondrous-blue to-wondrous-magenta rounded-xl shadow-md">
                    <ClipboardCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Review Your Answers</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Please confirm all information is correct</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Emergency Contact Summary */}
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-5 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-sm">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5 text-wondrous-blue" />
                      Emergency Contact
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Name:</span> {emergencyContact.name}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Phone:</span> {emergencyContact.phone}
                      </p>
                    </div>
                  </div>

                  {/* Health Answers Summary */}
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-sm">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-wondrous-blue" />
                      Health Screening
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(answers).map(([key, value]: [string, boolean]) => {
                        let questionText = "";
                        Object.values(HEALTH_QUESTIONS).forEach((category) => {
                          const q = category.questions.find((q) => q.key === key);
                          if (q) questionText = q.question;
                        });

                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                          >
                            <span className="text-gray-700 dark:text-gray-300 flex-1">{questionText}</span>
                            <span
                              className={`font-semibold px-3 py-1 rounded-full text-xs ${
                                value
                                  ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                              }`}
                            >
                              {value ? "Yes" : "No"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Risk Warning */}
                  {hasYesAnswers && !showRiskWarning && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <h4 className="font-semibold text-orange-900 dark:text-orange-300 mb-1">
                            Health Conditions Noted
                          </h4>
                          <p className="text-orange-700 dark:text-orange-400">
                            You&apos;ve indicated some health considerations. Your trainer will be
                            notified to ensure your safety.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {showRiskWarning && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-bold text-orange-900 dark:text-orange-300 mb-2">
                            Important Health Information
                          </h4>
                          <p className="text-sm text-orange-700 dark:text-orange-400 mb-3">
                            Thanks for your honesty. Your trainer will be notified confidentially
                            to ensure your safety during sessions. We may contact you to discuss any
                            accommodations needed.
                          </p>
                          <p className="text-xs text-orange-600 dark:text-orange-500">
                            By proceeding, you acknowledge that you&apos;ve answered honestly and accept
                            responsibility for participating despite these conditions.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Privacy Notice */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        This information is confidential and only shared with your trainer for safety.
                        We&apos;ll remind you to update this every 6 months.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="w-full py-6 text-base font-semibold rounded-xl border-2"
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-wondrous-blue to-wondrous-magenta text-white font-semibold py-6 text-base rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Submitting...
                    </div>
                  ) : showRiskWarning ? (
                    <>
                      I Understand — Complete Health Check
                      <Check className="w-5 h-5 ml-2" />
                    </>
                  ) : (
                    <>
                      Complete Health Check
                      <Check className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
