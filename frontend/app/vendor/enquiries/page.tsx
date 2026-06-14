"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vendorApi } from "@/lib/api";
import toast from "react-hot-toast";
import { Loader2, MessageSquare, Calendar, Phone, Mail, CheckCheck } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  NEW:     "bg-blue-100 text-blue-700",
  SEEN:    "bg-yellow-100 text-yellow-700",
  REPLIED: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "New", SEEN: "Seen", REPLIED: "Replied",
};

export default function VendorEnquiriesPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["vendor-enquiries"],
    queryFn:  () => vendorApi.myEnquiries() as Promise<any>,
  });
  const enquiries: any[] = data?.results ?? data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
        <p className="text-gray-500 text-sm mt-1">
          Couples interested in booking your services
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Total",
            value: enquiries.length,
            color: "#6B7280",
          },
          {
            label: "New",
            value: enquiries.filter((e: any) => e.status === "NEW").length,
            color: "#3B82F6",
          },
          {
            label: "Replied",
            value: enquiries.filter((e: any) => e.status === "REPLIED").length,
            color: "#16A34A",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label} Enquiries</div>
          </div>
        ))}
      </div>

      {/* Enquiry List */}
      {enquiries.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">💌</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No enquiries yet</h3>
          <p className="text-gray-500 text-sm">
            Couples will reach out here when they want to book your services.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {enquiries.map((enq: any) => (
            <div
              key={enq.id}
              className={`bg-white rounded-2xl border border-gray-100 p-5
                          ${enq.status === "NEW" ? "border-l-4 border-l-blue-400" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{enq.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[enq.status] || ""}`}>
                      {STATUS_LABELS[enq.status] || enq.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed mb-3">{enq.message}</p>

                  <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                    {enq.phone && (
                      <a href={`tel:${enq.phone}`}
                        className="flex items-center gap-1 hover:text-gray-700">
                        <Phone size={12} /> {enq.phone}
                      </a>
                    )}
                    {enq.email && (
                      <a href={`mailto:${enq.email}`}
                        className="flex items-center gap-1 hover:text-gray-700">
                        <Mail size={12} /> {enq.email}
                      </a>
                    )}
                    {enq.event_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(enq.event_date).toLocaleDateString("en-IN", {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                      </span>
                    )}
                    <span>
                      {new Date(enq.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Quick reply actions */}
                <div className="flex flex-col gap-2">
                  {enq.email && (
                    <a
                      href={`mailto:${enq.email}?subject=Re: Your Enquiry&body=Dear ${enq.name},%0D%0A%0D%0AThank you for your enquiry.`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                                 font-medium bg-[#C9952A]/10 text-[#C9952A] hover:bg-[#C9952A]/20"
                    >
                      <MessageSquare size={12} /> Reply
                    </a>
                  )}
                  {enq.status !== "REPLIED" && (
                    <button
                      onClick={() => toast("Mark as replied — connect your backend endpoint.")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                                 font-medium bg-green-50 text-green-600 hover:bg-green-100"
                    >
                      <CheckCheck size={12} /> Mark Replied
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
