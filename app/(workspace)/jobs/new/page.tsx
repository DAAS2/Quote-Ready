import type { Metadata } from "next";
import { NewEnquiryForm } from "@/components/jobs/new-enquiry-form";

export const metadata: Metadata = { title: "New enquiry" };

export default function NewEnquiryPage() {
  return <NewEnquiryForm />;
}
