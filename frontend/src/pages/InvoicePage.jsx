import React from "react";

const InvoicePage = () => {
  return (
    <div className="bg-[#F5F7FA] min-h-screen p-6">
      <div className="max-w-[1400px] mx-auto grid grid-cols-4 gap-6">

        {/* LEFT SIDEBAR */}
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <h2 className="font-semibold mb-4">Invoices</h2>

          {["INV-001", "INV-002", "INV-003", "INV-004"].map((inv, i) => (
            <div
              key={i}
              className="p-3 mb-2 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <p className="text-sm font-medium">{inv}</p>
              <p className="text-xs text-gray-500">
                Status: {i % 2 === 0 ? "Paid" : "Pending"}
              </p>
            </div>
          ))}
        </div>

        {/* MAIN CONTENT */}
        <div className="col-span-2 space-y-6">

          {/* INVOICE OVERVIEW */}
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <h2 className="font-semibold mb-4">Invoice Overview</h2>

            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
              <div>
                <p className="font-medium">Arsh Jenkins</p>
                <p className="text-sm text-gray-500">
                  Total Amount: $12,400
                </p>
                <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                  PAID
                </span>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>Sent Date: Aug 1, 2025</p>
              <p>Due Date: Aug 1, 2026</p>
            </div>
          </div>

          {/* LINE ITEMS */}
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <h2 className="font-semibold mb-4">Invoice Items</h2>

            {[
              { name: "Milestone Development", price: "$4,500" },
              { name: "Project Milestones", price: "$4,000" },
              { name: "Final Delivery", price: "$3,900" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex justify-between border-b py-2 text-sm"
              >
                <span>{item.name}</span>
                <span>{item.price}</span>
              </div>
            ))}

            <div className="mt-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>$12,400</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>$0</span>
              </div>
              <div className="flex justify-between font-semibold mt-2">
                <span>Total</span>
                <span>$12,400</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-6">

          {/* ACTIONS */}
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <h2 className="font-semibold mb-4">Actions</h2>

            <div className="flex flex-col gap-3">
              <button className="bg-blue-500 text-white py-2 rounded">
                View PDF
              </button>
              <button className="bg-green-500 text-white py-2 rounded">
                Approve
              </button>
              <button className="bg-purple-500 text-white py-2 rounded">
                Process Payment
              </button>
            </div>
          </div>

          {/* TIMELINE */}
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <h2 className="font-semibold mb-4">Payment Timeline</h2>

            <div className="text-sm text-gray-600 mb-2">
              Sent → Paid
            </div>

            <div className="w-full bg-gray-200 h-2 rounded">
              <div className="bg-green-500 h-2 w-full rounded"></div>
            </div>
          </div>

          {/* COMMUNICATION */}
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <h2 className="font-semibold mb-4">Communication</h2>

            <div className="space-y-3 text-sm">
              <p>Client approved invoice</p>
              <p>Payment processed</p>
              <p>Invoice generated</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default InvoicePage;