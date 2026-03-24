import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  RefreshCw,
  Wallet,
  Smartphone,
  LayoutDashboard,
  ArrowRightLeft,
  Building,
  CreditCard,
  Bell,
  FileText,
  Download,
  ShieldCheck,
  Users,
  FolderLock,
  Search,
  ChevronRight,
  Calculator,
  Edit3,
  ScanFace,
  ShieldAlert,
  Camera,
  UserPlus,
  Send,
  Phone,
  Calendar,
  LogOut,
  Upload,
  Link2,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  XCircle,
  Truck,
  Nfc,
  Plus,
} from "lucide-react";

export default function App() {
  const [view, setView] = useState("employer"); // 'employer' or 'employee'
  const [employerTab, setEmployerTab] = useState("payroll"); // payroll, vault, team
  const [employeeTab, setEmployeeTab] = useState("home"); // home, cards, vault

  const [payrollStep, setPayrollStep] = useState("input"); // input, calculating, review, processing, complete
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(1);
  const [payslipsGenerated, setPayslipsGenerated] = useState(false);
  const [kycStep, setKycStep] = useState("idle"); // idle, scanning, complete, linking, linked
  const [settlementBalance, setSettlementBalance] = useState(3500000);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [isAdvanceLoading, setIsAdvanceLoading] = useState(false);

  // Card Tab States
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [cardFrozen, setCardFrozen] = useState(false);
  const [isOrderingCard, setIsOrderingCard] = useState(false);

  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    phone: "",
    idNumber: "",
    role: "",
    salaryType: "fixed",
    rateType: "hourly",
    rate: "",
    base: "",
  });
  const [exitModal, setExitModal] = useState({
    isOpen: false,
    empId: null,
    date: "",
    name: "",
  });

  // Cycle Configuration for Pro-rata logic
  const cycleStart = new Date("2026-03-01");
  const cycleEnd = new Date("2026-03-31");
  const daysInCycle = 31;

  // Mock Data
  const [employees, setEmployees] = useState([
    {
      id: 1,
      name: "Sarah Jenkins",
      role: "Store Manager",
      salaryType: "fixed",
      base: 12500,
      additions: 0,
      carryover: 0,
      tax: 0,
      net: 0,
      status: "pending",
      balance: 145.5,
      creditUnlocked: true,
      advanceLimit: 4500,
      advanceTaken: 0,
      fica: "verified",
      phone: "+27 82 555 0192",
      onboardingDate: "2025-11-01",
      exitDate: null,
      physicalCardOrdered: false,
    },
    {
      id: 2,
      name: "David Mokoena",
      role: "Logistics",
      salaryType: "hourly",
      rate: 45,
      units: 160,
      base: 7200,
      additions: 1000,
      carryover: 0,
      tax: 0,
      net: 0,
      status: "pending",
      balance: 22.0,
      creditUnlocked: true,
      advanceLimit: 2000,
      advanceTaken: 0,
      fica: "verified",
      phone: "+27 71 555 8331",
      onboardingDate: "2025-06-15",
      exitDate: null,
      physicalCardOrdered: false,
    },
    {
      id: 3,
      name: "Aisha Patel",
      role: "Sales Rep",
      salaryType: "fixed",
      base: 9500,
      additions: 2500,
      carryover: 0,
      tax: 0,
      net: 0,
      status: "pending",
      balance: 5.5,
      creditUnlocked: false,
      advanceLimit: 0,
      advanceTaken: 0,
      fica: "pending_new",
      phone: "+27 63 555 9011",
      onboardingDate: "2026-03-20",
      exitDate: null,
      physicalCardOrdered: false,
    },
    {
      id: 4,
      name: "Bongani Ndlovu",
      role: "Security",
      salaryType: "fixed",
      base: 6500,
      additions: 0,
      carryover: 0,
      tax: 0,
      net: 0,
      status: "pending",
      balance: 0,
      creditUnlocked: false,
      advanceLimit: 0,
      advanceTaken: 0,
      fica: "pending_link",
      phone: "+27 72 555 1234",
      onboardingDate: "2026-03-23",
      exitDate: null,
      physicalCardOrdered: false,
    },
  ]);

  // --- PRO-RATA ENGINE ---
  const getEffectiveBase = (emp) => {
    if (emp.salaryType !== "fixed")
      return { amount: emp.base, isProrated: false, days: 0 };

    const start = emp.onboardingDate
      ? new Date(Math.max(new Date(emp.onboardingDate), cycleStart))
      : cycleStart;
    const end = emp.exitDate
      ? new Date(Math.min(new Date(emp.exitDate), cycleEnd))
      : cycleEnd;

    if (start > cycleEnd || end < cycleStart)
      return { amount: 0, isProrated: false, days: 0, excluded: true };

    const activeDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (activeDays >= daysInCycle)
      return { amount: emp.base, isProrated: false, days: daysInCycle };

    return {
      amount: (emp.base / daysInCycle) * activeDays,
      isProrated: true,
      days: activeDays,
    };
  };

  const activePayrollEmployees = employees.filter((e) => {
    if (!e.exitDate) return true;
    return new Date(e.exitDate) >= cycleStart;
  });

  const handleSendInvite = () => {
    const isFixed = newEmployee.salaryType === "fixed";
    const emp = {
      id: employees.length + 1,
      name: newEmployee.name || "New Hire",
      role: newEmployee.role || "Staff",
      salaryType: isFixed ? "fixed" : newEmployee.rateType,
      rate: isFixed ? 0 : Number(newEmployee.rate) || 0,
      units: isFixed ? null : 0,
      base: isFixed ? Number(newEmployee.base) || 0 : 0,
      additions: 0,
      carryover: 0,
      tax: 0,
      net: 0,
      status: "pending",
      balance: 0,
      creditUnlocked: false,
      advanceLimit: 0,
      advanceTaken: 0,
      fica: "pending_new",
      phone: newEmployee.phone || "+27 80 000 0000",
      onboardingDate: new Date().toISOString().split("T")[0],
      exitDate: null,
      physicalCardOrdered: false,
      justInvited: true,
    };

    setEmployees([...employees, emp]);
    setShowAddEmployee(false);
    setNewEmployee({
      name: "",
      phone: "",
      idNumber: "",
      role: "",
      salaryType: "fixed",
      rateType: "hourly",
      rate: "",
      base: "",
    });
  };

  const handleSetExitDate = (id, dateStr) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, exitDate: dateStr } : emp))
    );
  };

  const openExitModal = (emp) =>
    setExitModal({
      isOpen: true,
      empId: emp.id,
      date: emp.exitDate || "",
      name: emp.name,
    });
  const closeExitModal = () =>
    setExitModal({ isOpen: false, empId: null, date: "", name: "" });
  const confirmExitDate = () => {
    handleSetExitDate(exitModal.empId, exitModal.date);
    closeExitModal();
  };
  const clearExitDate = () => {
    handleSetExitDate(exitModal.empId, null);
    closeExitModal();
  };

  const handleUnitChange = (id, value) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === id) {
          const units = Number(value);
          return { ...emp, units, base: units * emp.rate };
        }
        return emp;
      })
    );
  };

  const handleAdditionChange = (id, value) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id ? { ...emp, additions: Number(value) } : emp
      )
    );
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingCsv(true);
    setTimeout(() => {
      setEmployees((prev) =>
        prev.map((emp) => {
          let updatedEmp = { ...emp };
          if (emp.name === "David Mokoena") {
            updatedEmp.units = 185;
            updatedEmp.base = 185 * updatedEmp.rate;
            updatedEmp.additions = 1500;
          } else if (emp.name === "Aisha Patel") {
            updatedEmp.additions = 3200;
          } else if (emp.name === "Sarah Jenkins") {
            updatedEmp.additions = 0;
          }
          return updatedEmp;
        })
      );
      setIsUploadingCsv(false);
      e.target.value = null;
    }, 1200);
  };

  const handleCalculate = () => {
    setPayrollStep("calculating");
    setTimeout(() => {
      setEmployees((prev) =>
        prev.map((emp) => {
          const { amount: effectiveBase, excluded } = getEffectiveBase(emp);
          if (excluded) return emp;

          // Calculate gross including any carryover from previous months
          const gross = effectiveBase + emp.additions + (emp.carryover || 0);
          const tax = gross * 0.18; // Mock 18% tax calculation
          // Net pay automatically deducts the advance they took!
          const net = gross - tax - (emp.advanceTaken || 0);

          return { ...emp, tax, net: Math.max(0, net) };
        })
      );
      setPayrollStep("review");
    }, 1500);
  };

  const handleExecutePayroll = () => {
    setPayrollStep("processing");

    setTimeout(() => {
      const amountToDeduct = activePayrollEmployees.reduce((sum, emp) => {
        return emp.fica === "verified" ? sum + emp.net : sum;
      }, 0);

      setSettlementBalance((prev) => prev - amountToDeduct);

      setEmployees((prev) =>
        prev.map((emp) => {
          const { excluded } = getEffectiveBase(emp);
          if (excluded) return emp;

          if (emp.fica !== "verified") {
            return { ...emp, status: "rolled_over", carryover: emp.net };
          }

          return {
            ...emp,
            status: "paid",
            balance: emp.balance + emp.net,
            creditUnlocked: true,
            carryover: 0,
            advanceTaken: 0, // Reset their advance facility for the new month
          };
        })
      );

      setPayrollStep("complete");
      setPayslipsGenerated(true);
    }, 2500);
  };

  const handleVerifyKyc = () => {
    setKycStep("scanning");
    setTimeout(() => {
      setKycStep("complete");
      setTimeout(() => {
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === selectedEmployeeId ? { ...emp, fica: "verified" } : emp
          )
        );
        setKycStep("idle");
      }, 1500);
    }, 3000);
  };

  const handleLinkExisting = () => {
    setKycStep("linking");
    setTimeout(() => {
      setKycStep("linked");
      setTimeout(() => {
        setEmployees((prev) =>
          prev.map((emp) => {
            if (emp.id === selectedEmployeeId) {
              return {
                ...emp,
                fica: "verified",
                balance: emp.balance + 350.25,
              };
            }
            return emp;
          })
        );
        setKycStep("idle");
      }, 2500);
    }, 1500);
  };

  const handleTakeAdvance = () => {
    setIsAdvanceLoading(true);
    setTimeout(() => {
      setEmployees((prev) =>
        prev.map((emp) => {
          if (emp.id === selectedEmployeeId) {
            return {
              ...emp,
              balance: emp.balance + emp.advanceLimit,
              advanceTaken: emp.advanceLimit,
            };
          }
          return emp;
        })
      );
      setIsAdvanceLoading(false);
    }, 1500);
  };

  const handleOrderPhysicalCard = () => {
    setIsOrderingCard(true);
    setTimeout(() => {
      setEmployees((prev) =>
        prev.map((emp) => {
          if (emp.id === selectedEmployeeId) {
            return { ...emp, physicalCardOrdered: true };
          }
          return emp;
        })
      );
      setIsOrderingCard(false);
    }, 2000);
  };

  // Reset card states when switching employees
  useEffect(() => {
    setShowCardDetails(false);
    setCardFrozen(false);
  }, [selectedEmployeeId]);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const totalNetSettleAmount = activePayrollEmployees
    .filter((e) => e.fica === "verified")
    .reduce((sum, e) => sum + e.net, 0);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-20 relative">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-bold text-white">
            U
          </div>
          <span className="text-xl font-semibold tracking-wide">
            Unity{" "}
            <span className="text-slate-400 text-sm font-normal">
              | Financial OS
            </span>
          </span>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setView("employer");
              setEmployerTab("payroll");
            }}
            className={`flex items-center px-4 py-2 rounded transition-colors ${
              view === "employer"
                ? "bg-slate-800 text-emerald-400 border border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Building className="w-4 h-4 mr-2" />
            Employer Portal
          </button>
          <button
            onClick={() => {
              setView("employee");
              setEmployeeTab("home");
              setKycStep("idle");
            }}
            className={`flex items-center px-4 py-2 rounded transition-colors ${
              view === "employee"
                ? "bg-slate-800 text-emerald-400 border border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4 mr-2" />
            Employee App
          </button>
        </div>
      </nav>

      <main className="flex-1 flex w-full max-w-7xl mx-auto overflow-hidden">
        {view === "employer" ? (
          /* ================= EMPLOYER VIEW ================= */
          <div className="flex w-full animate-in fade-in duration-500 h-[calc(100vh-72px)]">
            {/* Employer Sidebar */}
            <div className="w-64 bg-white border-r border-slate-200 py-6 px-4 flex flex-col space-y-2">
              <div className="mb-6 px-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Corsair Retail
                </p>
                <h2 className="text-lg font-bold text-slate-800 mt-1">
                  HR & Payroll
                </h2>
              </div>

              <button
                onClick={() => setEmployerTab("payroll")}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  employerTab === "payroll"
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <RefreshCw className="w-4 h-4 mr-3" /> Execute Payroll
              </button>
              <button
                onClick={() => setEmployerTab("vault")}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  employerTab === "vault"
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center">
                  <FolderLock className="w-4 h-4 mr-3" /> Document Vault
                </div>
                {payslipsGenerated && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
              </button>
              <button
                onClick={() => {
                  setEmployerTab("team");
                  setShowAddEmployee(false);
                }}
                className={`flex items-center px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  employerTab === "team"
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Users className="w-4 h-4 mr-3" /> Team & Onboarding
              </button>
            </div>

            {/* Employer Main Content */}
            <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
              {/* === PAYROLL TAB === */}
              {employerTab === "payroll" && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900">
                        Payroll Run
                      </h1>
                      <p className="text-slate-500 mt-1">
                        March 2026 Cycle (1st - 31st) •{" "}
                        {activePayrollEmployees.length} Active Employees
                      </p>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center space-x-3 transition-all duration-500">
                      <Wallet className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                          Settlement Account
                        </p>
                        <p
                          className={`font-bold transition-colors duration-1000 ${
                            payrollStep === "complete"
                              ? "text-indigo-600"
                              : "text-slate-800"
                          }`}
                        >
                          R{" "}
                          {settlementBalance.toLocaleString("en-ZA", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                      <div>
                        <h2 className="text-lg font-semibold flex items-center">
                          Step 1: Input & Adjustments
                        </h2>
                        <p className="text-sm text-slate-500 mb-3">
                          Log hours, overtime, and let the system handle
                          pro-rata logic automatically.
                        </p>

                        {payrollStep === "input" && (
                          <div className="flex items-center space-x-4">
                            <label className="cursor-pointer inline-flex items-center text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-3 py-1.5 rounded transition-colors shadow-sm">
                              {isUploadingCsv ? (
                                <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                              ) : (
                                <Upload className="w-3 h-3 mr-1.5" />
                              )}
                              {isUploadingCsv
                                ? "Parsing file..."
                                : "Bulk Upload CSV"}
                              <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={handleCsvUpload}
                                disabled={isUploadingCsv}
                              />
                            </label>
                            <a
                              href="data:text/csv;charset=utf-8,Employee_ID,Employee_Name,Hours_or_Days_Worked,Additions_and_OT\n1,Sarah Jenkins,0,0\n2,David Mokoena,160,0\n3,Aisha Patel,0,0"
                              download="Unity_Payroll_Template.csv"
                              className="text-[10px] text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
                              title="Download a blank CSV template"
                            >
                              Get CSV template
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="mt-1">
                        {payrollStep === "input" ? (
                          <button
                            onClick={handleCalculate}
                            disabled={isUploadingCsv}
                            className="flex items-center px-5 py-2.5 rounded-lg font-medium transition-all bg-slate-900 text-white hover:bg-slate-800 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Calculator className="w-4 h-4 mr-2" /> Calculate
                            Taxes
                          </button>
                        ) : payrollStep === "calculating" ? (
                          <button
                            disabled
                            className="flex items-center px-5 py-2.5 rounded-lg font-medium bg-slate-100 text-slate-500 cursor-wait"
                          >
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin text-indigo-500" />{" "}
                            SimplePay Engine...
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex items-center px-5 py-2.5 rounded-lg font-medium bg-emerald-50 text-emerald-700"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />{" "}
                            Calculations Locked
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-0 animate-in fade-in duration-300">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                              Employee
                            </th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                              Base Pay / Time
                            </th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                              Additions / OT
                            </th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                              Tax & Deduct.
                            </th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                              Net Salary
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activePayrollEmployees.map((emp) => {
                            const isPending = emp.fica !== "verified";
                            const {
                              amount: effectiveBase,
                              isProrated,
                              days: activeDays,
                            } = getEffectiveBase(emp);

                            return (
                              <tr
                                key={emp.id}
                                className={`hover:bg-slate-50/50 transition-colors ${
                                  isPending ? "bg-amber-50/30" : ""
                                }`}
                              >
                                <td className="px-6 py-4">
                                  <p className="font-medium text-slate-800 flex items-center">
                                    {emp.name}
                                    {isPending && (
                                      <ShieldAlert
                                        className="w-4 h-4 ml-2 text-amber-500"
                                        title="Pending KYC or Link"
                                      />
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {emp.salaryType === "fixed"
                                      ? "Salaried"
                                      : emp.salaryType === "hourly"
                                      ? "Hourly Worker"
                                      : "Daily Worker"}
                                  </p>
                                </td>

                                <td className="px-6 py-4 text-slate-700">
                                  {emp.salaryType === "fixed" ? (
                                    <div className="flex flex-col">
                                      <span className="font-medium text-slate-900">
                                        R{" "}
                                        {effectiveBase.toLocaleString("en-ZA", {
                                          minimumFractionDigits: 2,
                                        })}
                                      </span>
                                      {isProrated && (
                                        <div className="flex flex-col items-start mt-0.5 space-y-1">
                                          <span className="line-through text-slate-400 text-[10px]">
                                            R{emp.base.toLocaleString()}
                                          </span>
                                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wide border border-indigo-100 w-max">
                                            Pro-rated ({activeDays}d)
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ) : payrollStep === "input" ? (
                                    <div>
                                      <div className="flex items-center space-x-2 mb-1">
                                        <input
                                          type="number"
                                          value={emp.units || ""}
                                          onChange={(e) =>
                                            handleUnitChange(
                                              emp.id,
                                              e.target.value
                                            )
                                          }
                                          placeholder="0"
                                          className="w-16 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                        />
                                        <span className="text-xs font-medium text-slate-500">
                                          {emp.salaryType === "hourly"
                                            ? "hrs"
                                            : "days"}{" "}
                                          <span className="font-normal opacity-70">
                                            @ R{emp.rate}
                                          </span>
                                        </span>
                                      </div>
                                      <div className="text-sm font-semibold text-slate-900">
                                        R{" "}
                                        {emp.base.toLocaleString("en-ZA", {
                                          minimumFractionDigits: 2,
                                        })}
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="text-sm font-semibold text-slate-900">
                                        R{" "}
                                        {emp.base.toLocaleString("en-ZA", {
                                          minimumFractionDigits: 2,
                                        })}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {emp.units}{" "}
                                        {emp.salaryType === "hourly"
                                          ? "hrs"
                                          : "days"}{" "}
                                        logged
                                      </div>
                                    </div>
                                  )}
                                  {emp.carryover > 0 &&
                                    payrollStep === "input" && (
                                      <div className="text-xs text-indigo-600 font-medium mt-1">
                                        + R{" "}
                                        {emp.carryover.toLocaleString("en-ZA")}{" "}
                                        (Carried Over)
                                      </div>
                                    )}
                                </td>

                                <td className="px-6 py-4">
                                  {payrollStep === "input" ? (
                                    <div className="relative">
                                      <span className="absolute left-3 top-2 text-slate-400 text-sm">
                                        R
                                      </span>
                                      <input
                                        type="number"
                                        value={emp.additions}
                                        onChange={(e) =>
                                          handleAdditionChange(
                                            emp.id,
                                            e.target.value
                                          )
                                        }
                                        className="pl-7 pr-3 py-1.5 w-28 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-slate-700 font-medium">
                                      + R{" "}
                                      {emp.additions.toLocaleString("en-ZA", {
                                        minimumFractionDigits: 2,
                                      })}
                                    </span>
                                  )}
                                </td>

                                <td className="px-6 py-4 text-rose-600">
                                  {payrollStep === "input" ? (
                                    <div className="flex flex-col text-sm">
                                      <span className="text-slate-400 italic">
                                        Pending calc...
                                      </span>
                                      {emp.advanceTaken > 0 && (
                                        <span className="text-[11px] font-bold text-rose-500 mt-1 uppercase tracking-wide bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 w-max">
                                          - R{" "}
                                          {emp.advanceTaken.toLocaleString(
                                            "en-ZA",
                                            { minimumFractionDigits: 2 }
                                          )}{" "}
                                          Advance
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col text-sm">
                                      <span>
                                        - R{" "}
                                        {emp.tax.toLocaleString("en-ZA", {
                                          minimumFractionDigits: 2,
                                        })}{" "}
                                        (Tax)
                                      </span>
                                      {emp.advanceTaken > 0 && (
                                        <span className="text-[11px] font-bold text-rose-500 mt-1 uppercase tracking-wide bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 w-max">
                                          - R{" "}
                                          {emp.advanceTaken.toLocaleString(
                                            "en-ZA",
                                            { minimumFractionDigits: 2 }
                                          )}{" "}
                                          Advance
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>

                                <td className="px-6 py-4 font-bold text-slate-900">
                                  {payrollStep === "input" ? (
                                    <span className="text-slate-400 font-normal">
                                      --
                                    </span>
                                  ) : (
                                    <div className="flex flex-col">
                                      <span>
                                        R{" "}
                                        {emp.net.toLocaleString("en-ZA", {
                                          minimumFractionDigits: 2,
                                        })}{" "}
                                        {emp.status === "paid" &&
                                          !isPending && (
                                            <span className="ml-2 inline-flex text-emerald-600">
                                              <CheckCircle2 className="w-4 h-4" />
                                            </span>
                                          )}
                                      </span>
                                      {payrollStep === "review" &&
                                        isPending && (
                                          <span className="text-[10px] text-amber-600 font-bold mt-1 uppercase bg-amber-100 px-2 py-0.5 rounded w-max border border-amber-200">
                                            Will Roll Over
                                          </span>
                                        )}
                                      {payrollStep === "complete" &&
                                        emp.status === "rolled_over" && (
                                          <span className="text-[10px] text-amber-600 font-bold mt-1 uppercase bg-amber-100 px-2 py-0.5 rounded w-max border border-amber-200">
                                            Rolled to Next Cycle
                                          </span>
                                        )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {(payrollStep === "review" ||
                        payrollStep === "processing" ||
                        payrollStep === "complete") && (
                        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center animate-in fade-in">
                          <div>
                            <h2 className="text-lg font-semibold">
                              Step 2: Approve & Execute Transfer
                            </h2>
                            <p className="text-sm text-slate-500 flex items-center mt-1">
                              <ShieldCheck className="w-4 h-4 mr-1 text-indigo-500" />
                              Calculations verified by SimplePay Engine. Ready
                              to settle.
                            </p>
                          </div>
                          <button
                            onClick={handleExecutePayroll}
                            disabled={payrollStep !== "review"}
                            className={`px-8 py-3 rounded-lg font-bold shadow-sm transition-all flex items-center ${
                              payrollStep === "complete"
                                ? "bg-emerald-500 text-white cursor-not-allowed shadow-emerald-500/20"
                                : payrollStep === "processing"
                                ? "bg-slate-300 text-slate-600 cursor-wait"
                                : "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md"
                            }`}
                          >
                            {payrollStep === "complete" ? (
                              <>
                                <CheckCircle2 className="w-5 h-5 mr-2" />{" "}
                                Payroll Complete
                              </>
                            ) : payrollStep === "processing" ? (
                              <>
                                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />{" "}
                                Distributing...
                              </>
                            ) : (
                              <>
                                <ArrowRightLeft className="w-5 h-5 mr-2" />{" "}
                                Execute (R{" "}
                                {totalNetSettleAmount.toLocaleString("en-ZA", {
                                  minimumFractionDigits: 2,
                                })}
                                )
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {payrollStep === "complete" && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col space-y-2 animate-in fade-in">
                      <div className="flex items-center space-x-3 text-emerald-800">
                        <CheckCircle2 className="w-6 h-6 shrink-0" />
                        <h3 className="font-bold">
                          Settlement & Documentation Complete
                        </h3>
                      </div>
                      <div className="ml-9 text-emerald-700 text-sm space-y-1">
                        <p>
                          ✓ Funds deposited instantly to active GoTyme wallets
                          (0 banking delays).
                        </p>
                        <p>✓ Advance facilities reconciled automatically.</p>
                        <p>
                          ✓ Payslips auto-generated and stored in Document
                          Vault.
                        </p>
                        <button
                          onClick={() => setEmployerTab("vault")}
                          className="mt-2 font-bold underline"
                        >
                          View HR Vault &rarr;
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === VAULT TAB === */}
              {employerTab === "vault" && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900 flex items-center">
                        <FolderLock className="w-8 h-8 mr-3 text-indigo-500" />{" "}
                        HR Document Vault
                      </h1>
                      <p className="text-slate-500 mt-1">
                        Centralised, compliant storage for all staff financial
                        documents.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg">
                        Payslips
                      </h3>
                      <p className="text-slate-500 text-sm mb-2">
                        {payslipsGenerated
                          ? "March 2026 available"
                          : "Awaiting payroll run"}
                      </p>
                      <p className="text-xs text-indigo-600 font-medium">
                        Auto-distributed to staff app.
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg">
                        Tax (IRP5)
                      </h3>
                      <p className="text-slate-500 text-sm mb-2">
                        2025/2026 Tax Year Ready
                      </p>
                      <p className="text-xs text-emerald-600 font-medium">
                        SARS Compliant Format.
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-dashed bg-slate-50 flex flex-col justify-center items-center text-center">
                      <h3 className="font-bold text-slate-600 mb-1">
                        Zero Admin
                      </h3>
                      <p className="text-slate-400 text-xs">
                        Employees access docs directly via their Unity app. No
                        more HR requests.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center space-x-2 text-slate-500 text-sm">
                      <Search className="w-4 h-4" />{" "}
                      <input
                        type="text"
                        placeholder="Search employee documents..."
                        className="bg-transparent outline-none flex-1"
                      />
                    </div>
                    <table className="w-full text-left">
                      <tbody className="divide-y divide-slate-100">
                        {employees.map((emp) => (
                          <tr
                            key={emp.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-800">
                                {emp.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {emp.role}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col space-y-2">
                                {payslipsGenerated && emp.status === "paid" ? (
                                  <button className="flex items-center text-sm text-slate-700 hover:text-indigo-600">
                                    <FileText className="w-4 h-4 mr-2 text-indigo-400" />{" "}
                                    Mar_2026_Payslip.pdf{" "}
                                    <Download className="w-3 h-3 ml-2 opacity-50" />
                                  </button>
                                ) : (
                                  <span className="flex items-center text-sm text-slate-400">
                                    <FileText className="w-4 h-4 mr-2" />{" "}
                                    Pending Run...
                                  </span>
                                )}
                                <button className="flex items-center text-sm text-slate-700 hover:text-emerald-600">
                                  <ShieldCheck className="w-4 h-4 mr-2 text-emerald-400" />{" "}
                                  IRP5_2025_2026.pdf{" "}
                                  <Download className="w-3 h-3 ml-2 opacity-50" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* === TEAM & COMPLIANCE TAB === */}
              {employerTab === "team" && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900 flex items-center">
                        <Users className="w-8 h-8 mr-3 text-blue-500" /> Team &
                        Onboarding
                      </h1>
                      <p className="text-slate-500 mt-1">
                        Manage staff compliance and invite new hires to the
                        Unity platform.
                      </p>
                    </div>
                    {!showAddEmployee && (
                      <button
                        onClick={() => setShowAddEmployee(true)}
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center shadow-sm"
                      >
                        <UserPlus className="w-4 h-4 mr-2" /> Onboard Staff
                      </button>
                    )}
                  </div>

                  {showAddEmployee ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                      <div className="p-6 border-b border-slate-100 bg-slate-50">
                        <h2 className="text-lg font-semibold flex items-center">
                          <Send className="w-5 h-5 mr-2 text-indigo-500" /> Send
                          Unity App Invite
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                          Enter the details below. We'll text them a secure link
                          to download the app and connect to Corsair.
                        </p>
                      </div>
                      <div className="p-6 grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Full Name
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. John Doe"
                              value={newEmployee.name}
                              onChange={(e) =>
                                setNewEmployee({
                                  ...newEmployee,
                                  name: e.target.value,
                                })
                              }
                              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Mobile Number (For SMS Link)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-slate-400">
                                <Phone className="w-4 h-4" />
                              </span>
                              <input
                                type="tel"
                                placeholder="+27 00 000 0000"
                                value={newEmployee.phone}
                                onChange={(e) =>
                                  setNewEmployee({
                                    ...newEmployee,
                                    phone: e.target.value,
                                  })
                                }
                                className="w-full border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                              SA ID Number
                            </label>
                            <input
                              type="text"
                              placeholder="13-digit ID number"
                              value={newEmployee.idNumber}
                              onChange={(e) =>
                                setNewEmployee({
                                  ...newEmployee,
                                  idNumber: e.target.value,
                                })
                              }
                              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Job Role
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Cashier"
                              value={newEmployee.role}
                              onChange={(e) =>
                                setNewEmployee({
                                  ...newEmployee,
                                  role: e.target.value,
                                })
                              }
                              className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Compensation Type
                            </label>
                            <div className="flex space-x-4 mb-3">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="salaryType"
                                  checked={newEmployee.salaryType === "fixed"}
                                  onChange={() =>
                                    setNewEmployee({
                                      ...newEmployee,
                                      salaryType: "fixed",
                                    })
                                  }
                                  className="text-emerald-500 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-slate-700">
                                  Fixed Monthly
                                </span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="salaryType"
                                  checked={
                                    newEmployee.salaryType === "variable"
                                  }
                                  onChange={() =>
                                    setNewEmployee({
                                      ...newEmployee,
                                      salaryType: "variable",
                                    })
                                  }
                                  className="text-emerald-500 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-slate-700">
                                  Variable (Time-based)
                                </span>
                              </label>
                            </div>

                            {newEmployee.salaryType === "fixed" ? (
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  Monthly Salary (ZAR)
                                </label>
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={newEmployee.base}
                                  onChange={(e) =>
                                    setNewEmployee({
                                      ...newEmployee,
                                      base: e.target.value,
                                    })
                                  }
                                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                              </div>
                            ) : (
                              <div className="flex space-x-3">
                                <div className="w-1/2">
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Rate Type
                                  </label>
                                  <select
                                    value={newEmployee.rateType}
                                    onChange={(e) =>
                                      setNewEmployee({
                                        ...newEmployee,
                                        rateType: e.target.value,
                                      })
                                    }
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                  >
                                    <option value="hourly">Per Hour</option>
                                    <option value="daily">Per Day</option>
                                  </select>
                                </div>
                                <div className="w-1/2">
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Rate (ZAR)
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    value={newEmployee.rate}
                                    onChange={(e) =>
                                      setNewEmployee({
                                        ...newEmployee,
                                        rate: e.target.value,
                                      })
                                    }
                                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="pt-5 flex justify-end space-x-3">
                            <button
                              onClick={() => setShowAddEmployee(false)}
                              className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSendInvite}
                              className="px-6 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 flex items-center shadow-sm"
                            >
                              <Send className="w-4 h-4 mr-2" /> Send SMS Invite
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                              Employee
                            </th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                              Contact
                            </th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                              Account Status
                            </th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">
                              FICA (KYC)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {employees.map((emp) => (
                            <tr
                              key={emp.id}
                              className={`hover:bg-slate-50/50 ${
                                emp.justInvited ? "bg-indigo-50/50" : ""
                              }`}
                            >
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-800">
                                  {emp.name}
                                </p>
                                <p className="text-xs text-slate-500 mb-1.5">
                                  {emp.role}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <span
                                    className="inline-flex items-center text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium"
                                    title="Onboarding Date"
                                  >
                                    <Calendar className="w-3 h-3 mr-1" /> Joined{" "}
                                    {emp.onboardingDate}
                                  </span>
                                  {emp.exitDate ? (
                                    <span
                                      onClick={() => openExitModal(emp)}
                                      className="inline-flex items-center text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-2 py-1 rounded font-medium cursor-pointer hover:bg-rose-100 transition-colors"
                                      title="Edit Exit Date"
                                    >
                                      <LogOut className="w-3 h-3 mr-1" /> Exits{" "}
                                      {emp.exitDate}
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => openExitModal(emp)}
                                      className="inline-flex items-center text-[10px] bg-white border border-slate-200 text-slate-500 hover:text-rose-500 hover:border-rose-300 px-2 py-1 rounded font-medium transition-colors"
                                    >
                                      <LogOut className="w-3 h-3 mr-1 text-slate-400 group-hover:text-rose-400" />{" "}
                                      Set Exit
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                                {emp.phone}
                              </td>
                              <td className="px-6 py-4">
                                {emp.exitDate &&
                                new Date(emp.exitDate) < cycleStart ? (
                                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 flex items-center w-max">
                                    <LogOut className="w-3 h-3 mr-1" />{" "}
                                    Offboarded
                                  </span>
                                ) : emp.fica === "verified" ? (
                                  <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded border border-emerald-200 flex items-center w-max">
                                    <Wallet className="w-3 h-3 mr-1" /> Active
                                    Wallet
                                  </span>
                                ) : emp.justInvited ? (
                                  <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded border border-indigo-200 flex items-center w-max">
                                    <Send className="w-3 h-3 mr-1" /> SMS Invite
                                    Sent
                                  </span>
                                ) : emp.fica === "pending_link" ? (
                                  <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded border border-indigo-200 flex items-center w-max">
                                    <Link2 className="w-3 h-3 mr-1" /> Account
                                    Found
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 flex items-center w-max">
                                    <ShieldAlert className="w-3 h-3 mr-1" />{" "}
                                    Locked (Awaiting FICA)
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {emp.fica === "verified" ? (
                                  <span className="inline-flex items-center text-emerald-600 text-sm font-medium">
                                    <CheckCircle2 className="w-4 h-4 mr-1" />{" "}
                                    Verified
                                  </span>
                                ) : emp.fica === "pending_link" ? (
                                  <span className="inline-flex items-center text-indigo-500 text-sm font-medium">
                                    <Link2 className="w-4 h-4 mr-1" /> Pending
                                    Link
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-amber-500 text-sm font-medium">
                                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />{" "}
                                    Pending App Setup
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Exit Date Modal */}
                  {exitModal.isOpen && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
                      <div className="bg-white rounded-xl shadow-xl w-[400px] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                          <h3 className="text-lg font-bold text-slate-900 flex items-center">
                            <LogOut className="w-5 h-5 mr-2 text-rose-500" />{" "}
                            Manage Exit Date
                          </h3>
                          <p className="text-sm text-slate-500 mt-1">
                            Set the final working date for{" "}
                            <strong className="text-slate-800">
                              {exitModal.name}
                            </strong>
                            .
                          </p>
                        </div>
                        <div className="p-6">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Final Date
                          </label>
                          <input
                            type="date"
                            value={exitModal.date}
                            onChange={(e) =>
                              setExitModal({
                                ...exitModal,
                                date: e.target.value,
                              })
                            }
                            className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                          <p className="text-xs text-slate-400 mt-3">
                            They will be automatically excluded from payroll
                            runs starting after this date.
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                          {employees.find((e) => e.id === exitModal.empId)
                            ?.exitDate ? (
                            <button
                              onClick={clearExitDate}
                              className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
                            >
                              Clear Exit Date
                            </button>
                          ) : (
                            <div></div>
                          )}
                          <div className="flex space-x-3">
                            <button
                              onClick={closeExitModal}
                              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={confirmExitDate}
                              disabled={!exitModal.date}
                              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Confirm Exit
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ================= EMPLOYEE VIEW (MOBILE SIMULATION) ================= */
          <div className="flex justify-center items-center py-8 w-full animate-in fade-in duration-500 bg-slate-100">
            {/* Demo Controls (Outside Phone) */}
            <div className="mr-12 w-64 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                  Demo Personas
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Switch users to see their live mobile experience.
                </p>
                <div className="space-y-2">
                  {employees.map((emp) => {
                    const isPending = emp.fica !== "verified";
                    return (
                      <button
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmployeeId(emp.id);
                          setKycStep("idle");
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex justify-between items-center ${
                          selectedEmployeeId === emp.id
                            ? "bg-slate-900 text-white shadow-md"
                            : "hover:bg-slate-100 text-slate-700 border border-slate-100"
                        }`}
                      >
                        <span className="font-medium flex items-center">
                          {emp.name}
                          {isPending && (
                            <span
                              className={`ml-2 w-2 h-2 rounded-full ${
                                emp.fica === "pending_link"
                                  ? "bg-indigo-500"
                                  : "bg-amber-500"
                              }`}
                            ></span>
                          )}
                        </span>
                        {selectedEmployeeId === emp.id && (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Contextual Demo Tips */}
                {selectedEmployee.fica === "pending_new" && (
                  <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs shadow-sm">
                    <strong>💡 Demo Tip:</strong> {selectedEmployee.name} is a
                    completely <strong>new user</strong>. They must complete
                    Smile ID FICA verification to unlock their account.
                  </div>
                )}
                {selectedEmployee.fica === "pending_link" && (
                  <div className="mt-6 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 text-xs shadow-sm">
                    <strong>💡 Demo Tip:</strong> {selectedEmployee.name} is an{" "}
                    <strong>existing Unity user</strong>. The system found their
                    profile. Click "Link Unity Wallet" below to bypass FICA.
                  </div>
                )}
                {selectedEmployee.fica === "verified" &&
                  employeeTab === "home" &&
                  selectedEmployee.advanceTaken === 0 && (
                    <div className="mt-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs shadow-sm">
                      <strong>💡 Demo Tip:</strong> Click{" "}
                      <strong>Transfer to Wallet</strong> to take an advance.
                      Watch the wallet balance jump up, then check the Employer
                      Portal to see the automated deduction!
                    </div>
                  )}
                {selectedEmployee.fica === "verified" &&
                  employeeTab === "cards" &&
                  !selectedEmployee.physicalCardOrdered && (
                    <div className="mt-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs shadow-sm">
                      <strong>💡 Demo Tip:</strong> The Virtual Card is active
                      instantly. Click <strong>Order Physical Card</strong> to
                      simulate a delivery order.
                    </div>
                  )}
              </div>
            </div>

            {/* Mobile Device Mockup */}
            <div className="w-[380px] h-[780px] bg-slate-900 rounded-[3rem] p-4 shadow-2xl relative border-[6px] border-slate-800">
              <div className="bg-slate-50 w-full h-full rounded-[2.2rem] overflow-hidden flex flex-col relative">
                {/* Status Bar Mock */}
                <div className="h-10 flex justify-between items-center px-6 text-[11px] font-semibold text-slate-800 bg-white z-10">
                  <span>9:41</span>
                  <div className="flex space-x-1">
                    <span>LTE</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* KYC BLOCKER LAYER: NEW USER (SMILE ID FLOW) */}
                {selectedEmployee.fica === "pending_new" ? (
                  <div className="flex-1 bg-white flex flex-col justify-center px-6 relative animate-in zoom-in-95">
                    {kycStep === "idle" && (
                      <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-500 border-4 border-indigo-100">
                          <ShieldAlert className="w-10 h-10" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            Account Setup
                          </h2>
                          <p className="text-slate-500 text-sm px-2">
                            To receive your Corsair salary, please complete FICA
                            verification.
                          </p>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-100 space-y-4">
                          <div className="flex items-center space-x-3 text-sm text-slate-700 font-medium">
                            <div className="w-8 h-8 bg-white rounded shadow-sm flex items-center justify-center">
                              <FileText className="w-4 h-4 text-slate-400" />
                            </div>
                            <p>1. Scan your Smart ID / Passport</p>
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-slate-700 font-medium">
                            <div className="w-8 h-8 bg-white rounded shadow-sm flex items-center justify-center">
                              <ScanFace className="w-4 h-4 text-slate-400" />
                            </div>
                            <p>2. Take a quick selfie</p>
                          </div>
                        </div>

                        <div className="pt-2 space-y-3">
                          <button
                            onClick={handleVerifyKyc}
                            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-indigo-700 transition-colors flex justify-center items-center"
                          >
                            <Camera className="w-5 h-5 mr-2" /> Start Smile ID
                            Verification
                          </button>
                          <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-wider font-semibold">
                            Powered by Smile ID & GoTyme Bank
                          </p>
                        </div>
                      </div>
                    )}

                    {kycStep === "scanning" && (
                      <div className="text-center space-y-6 flex flex-col items-center justify-center h-full">
                        <div className="relative">
                          <ScanFace className="w-24 h-24 text-indigo-300 animate-pulse" />
                          <div className="absolute inset-0 border-t-2 border-indigo-600 rounded-full animate-spin"></div>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 mb-1">
                            Analysing Face & ID
                          </h2>
                          <p className="text-slate-500 text-sm">
                            Please hold your device steady...
                          </p>
                        </div>
                      </div>
                    )}

                    {kycStep === "complete" && (
                      <div className="text-center space-y-6 flex flex-col items-center justify-center h-full animate-in zoom-in-50">
                        <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                          <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900 mb-1">
                            Verification Success!
                          </h2>
                          <p className="text-emerald-600 text-sm font-medium">
                            FICA profile automatically updated.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : selectedEmployee.fica === "pending_link" ? (
                  /* KYC BLOCKER LAYER: EXISTING USER (LINK FLOW) */
                  <div className="flex-1 bg-slate-50 flex flex-col justify-center px-6 relative animate-in zoom-in-95">
                    {kycStep === "idle" && (
                      <div className="text-center space-y-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 border-4 border-emerald-100">
                          <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            Account Found!
                          </h2>
                          <p className="text-slate-500 text-sm">
                            Welcome back, {selectedEmployee.name.split(" ")[0]}.
                            We found your existing Unity Wallet linked to your
                            mobile number.
                          </p>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left flex items-center space-x-3">
                          <div className="bg-white p-2 rounded-lg shadow-sm">
                            <Wallet className="w-6 h-6 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              Unity Wallet (Active)
                            </p>
                            <p className="text-xs text-slate-500">
                              GoTyme Verified • {selectedEmployee.phone}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={handleLinkExisting}
                            className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-slate-800 transition-colors flex justify-center items-center"
                          >
                            <Link2 className="w-5 h-5 mr-2" /> Link to Corsair
                            Payroll
                          </button>
                        </div>
                      </div>
                    )}

                    {kycStep === "linking" && (
                      <div className="text-center space-y-6 flex flex-col items-center justify-center h-full">
                        <div className="relative">
                          <RefreshCw className="w-16 h-16 text-emerald-400 animate-spin mx-auto" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 mb-1">
                            Linking Account
                          </h2>
                          <p className="text-slate-500 text-sm">
                            Matching your payroll records...
                          </p>
                        </div>
                      </div>
                    )}

                    {kycStep === "linked" && (
                      <div className="text-center space-y-6 flex flex-col items-center justify-center h-full animate-in zoom-in-50">
                        <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 mx-auto">
                          <Building className="w-10 h-10" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900 mb-1">
                            Successfully Linked!
                          </h2>
                          <p className="text-emerald-600 text-sm font-medium px-4">
                            Your existing Unity wallet is now connected to
                            Corsair.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : /* --- MOBILE HOME TAB --- */
                employeeTab === "home" ? (
                  <div className="flex-1 overflow-y-auto pb-20 animate-in slide-in-from-left-2">
                    {/* Header */}
                    <div className="bg-white px-6 pb-6 pt-2 rounded-b-3xl shadow-sm relative z-10">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm">
                            {selectedEmployee.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800">
                            Hi, {selectedEmployee.name.split(" ")[0]}
                          </span>
                        </div>
                        <Bell className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">
                        Available Balance
                      </p>
                      <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                        <span className="text-xl text-slate-400 mr-1 font-normal">
                          R
                        </span>
                        {selectedEmployee.balance.toLocaleString("en-ZA", {
                          minimumFractionDigits: 2,
                        })}
                      </h2>
                    </div>

                    <div className="p-5 space-y-5">
                      {/* Action Buttons */}
                      <div className="grid grid-cols-4 gap-4">
                        {["Pay", "Transfer", "Cards", "Vault"].map(
                          (label, i) => (
                            <div
                              key={label}
                              className="flex flex-col items-center"
                            >
                              <button
                                onClick={() =>
                                  label === "Vault"
                                    ? setEmployeeTab("vault")
                                    : label === "Cards"
                                    ? setEmployeeTab("cards")
                                    : null
                                }
                                className="w-12 h-12 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-1.5 text-slate-700 active:scale-95 transition-transform"
                              >
                                {i === 0 ? (
                                  <ArrowRightLeft className="w-5 h-5" />
                                ) : i === 1 ? (
                                  <RefreshCw className="w-5 h-5" />
                                ) : i === 2 ? (
                                  <CreditCard className="w-5 h-5" />
                                ) : (
                                  <FolderLock className="w-5 h-5 text-indigo-600" />
                                )}
                              </button>
                              <span className="text-[10px] font-medium text-slate-600">
                                {label}
                              </span>
                            </div>
                          )
                        )}
                      </div>

                      {/* Dynamic Credit Banner */}
                      <div
                        className={`p-4 rounded-2xl border transition-all duration-500 relative overflow-hidden ${
                          selectedEmployee.creditUnlocked
                            ? "bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-indigo-500 shadow-md shadow-indigo-200"
                            : "bg-white border-slate-200 text-slate-400"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2 relative z-10">
                          <h3 className="font-bold text-sm">
                            GoTyme Salary Advance
                          </h3>
                          {selectedEmployee.creditUnlocked &&
                            selectedEmployee.advanceTaken === 0 && (
                              <span className="text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                                Available
                              </span>
                            )}
                          {selectedEmployee.advanceTaken > 0 && (
                            <span className="text-[10px] uppercase tracking-wider bg-emerald-500/80 px-2 py-0.5 rounded-full backdrop-blur-sm border border-emerald-400/50">
                              Active
                            </span>
                          )}
                        </div>

                        {selectedEmployee.creditUnlocked ? (
                          selectedEmployee.advanceTaken > 0 ? (
                            <div className="relative z-10">
                              <p className="text-2xl font-bold mb-1">
                                R{" "}
                                {selectedEmployee.advanceTaken.toLocaleString(
                                  "en-ZA",
                                  { minimumFractionDigits: 2 }
                                )}
                              </p>
                              <p className="text-[11px] text-indigo-100 opacity-90">
                                Advance disbursed. Will be deducted from
                                upcoming payroll.
                              </p>
                            </div>
                          ) : (
                            <div className="relative z-10">
                              <p className="text-2xl font-bold mb-1">
                                R{" "}
                                {selectedEmployee.advanceLimit.toLocaleString(
                                  "en-ZA",
                                  { minimumFractionDigits: 2 }
                                )}
                              </p>
                              <p className="text-[11px] text-indigo-100 opacity-90">
                                0% Admin fee. Payroll deducted.
                              </p>
                              <button
                                onClick={handleTakeAdvance}
                                disabled={isAdvanceLoading}
                                className="mt-3 bg-white text-indigo-600 text-xs font-bold px-4 py-2 rounded-lg w-full shadow-sm flex items-center justify-center h-8"
                              >
                                {isAdvanceLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                ) : (
                                  "Transfer to Wallet"
                                )}
                              </button>
                            </div>
                          )
                        ) : (
                          <>
                            <p className="text-xl font-bold mb-1 opacity-50 text-slate-300">
                              Locked
                            </p>
                            <p className="text-xs">
                              Awaiting first salary deposit to unlock.
                            </p>
                          </>
                        )}
                      </div>

                      {/* Transactions */}
                      <div>
                        <h3 className="font-bold text-slate-900 mb-3 text-sm px-1">
                          Recent Activity
                        </h3>
                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                          {/* Salary Advance Receipt Simulation */}
                          {selectedEmployee.advanceTaken > 0 && (
                            <div className="flex justify-between items-center p-4 border-b border-slate-50 bg-indigo-50/30">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
                                  <ArrowRightLeft className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">
                                    GoTyme Advance
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Just now • Transfer
                                  </p>
                                </div>
                              </div>
                              <p className="font-bold text-indigo-600 text-sm">
                                +R{" "}
                                {selectedEmployee.advanceTaken.toLocaleString(
                                  "en-ZA",
                                  { minimumFractionDigits: 2 }
                                )}
                              </p>
                            </div>
                          )}

                          {selectedEmployee.status === "paid" && (
                            <div className="flex justify-between items-center p-4 border-b border-slate-50 bg-emerald-50/30">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3">
                                  <Building className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">
                                    Corsair Payroll
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Just now • Salary
                                  </p>
                                </div>
                              </div>
                              <p className="font-bold text-emerald-600 text-sm">
                                +R{" "}
                                {selectedEmployee.net.toLocaleString("en-ZA", {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                          )}
                          <div className="flex justify-between items-center p-4 border-b border-slate-50">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mr-3">
                                <Wallet className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">
                                  Airtime Purchase
                                </p>
                                <p className="text-xs text-slate-500">
                                  Yesterday • Vodacom
                                </p>
                              </div>
                            </div>
                            <p className="font-semibold text-slate-800 text-sm">
                              -R 50.00
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : employeeTab === "cards" ? (
                  /* --- MOBILE CARDS TAB --- */
                  <div className="flex-1 bg-slate-50 flex flex-col animate-in slide-in-from-right-2 overflow-y-auto pb-20">
                    <div className="bg-slate-900 px-6 pt-4 pb-6 rounded-b-3xl shadow-md text-white">
                      <h2 className="text-2xl font-bold flex items-center mt-2">
                        <CreditCard className="w-6 h-6 mr-2 opacity-80" /> My
                        Cards
                      </h2>
                    </div>

                    <div className="p-5 -mt-4 space-y-5">
                      {/* VIRTUAL CARD */}
                      <div className="space-y-4">
                        <div
                          className={`relative w-full h-48 rounded-2xl p-5 text-white shadow-xl transition-all duration-300 ${
                            cardFrozen
                              ? "bg-slate-500 grayscale"
                              : "bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-800"
                          }`}
                        >
                          {cardFrozen && (
                            <div className="absolute inset-0 bg-slate-900/40 rounded-2xl flex items-center justify-center z-20 backdrop-blur-[1px]">
                              <span className="bg-slate-900/80 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase flex items-center">
                                <Lock className="w-3 h-3 mr-1.5" /> Frozen
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                                Unity Virtual
                              </span>
                              <p className="font-semibold mt-1">GoTyme Bank</p>
                            </div>
                            <Nfc className="w-6 h-6 opacity-80" />
                          </div>

                          <div className="mt-8 flex items-center justify-between">
                            <p className="font-mono text-lg tracking-widest font-medium drop-shadow-md">
                              {showCardDetails
                                ? "4532 1234 5678 9012"
                                : "•••• •••• •••• 9012"}
                            </p>
                          </div>

                          <div className="mt-6 flex justify-between items-end">
                            <div>
                              <p className="text-[9px] uppercase tracking-widest opacity-70">
                                Cardholder
                              </p>
                              <p className="font-medium text-sm drop-shadow-sm">
                                {selectedEmployee.name}
                              </p>
                            </div>
                            <div className="flex space-x-6">
                              <div>
                                <p className="text-[9px] uppercase tracking-widest opacity-70">
                                  Valid Thru
                                </p>
                                <p className="font-medium text-sm font-mono drop-shadow-sm">
                                  12/29
                                </p>
                              </div>
                              <div>
                                <p className="text-[9px] uppercase tracking-widest opacity-70">
                                  CVV
                                </p>
                                <p className="font-medium text-sm font-mono drop-shadow-sm">
                                  {showCardDetails ? "492" : "•••"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Digital Wallets */}
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            disabled={cardFrozen}
                            className="bg-black text-white text-[11px] font-bold py-2.5 rounded-xl flex items-center justify-center shadow-sm disabled:opacity-50"
                          >
                            Add to Apple Wallet
                          </button>
                          <button
                            disabled={cardFrozen}
                            className="bg-white border border-slate-200 text-slate-800 text-[11px] font-bold py-2.5 rounded-xl flex items-center justify-center shadow-sm disabled:opacity-50"
                          >
                            Add to G Pay
                          </button>
                        </div>

                        {/* Card Controls */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2">
                          <button
                            onClick={() => setShowCardDetails(!showCardDetails)}
                            className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors"
                          >
                            <div className="flex items-center text-slate-700">
                              {showCardDetails ? (
                                <EyeOff className="w-5 h-5 mr-3 text-slate-400" />
                              ) : (
                                <Eye className="w-5 h-5 mr-3 text-slate-400" />
                              )}
                              <span className="text-sm font-semibold">
                                {showCardDetails
                                  ? "Hide Card Details"
                                  : "Show Card Details"}
                              </span>
                            </div>
                          </button>
                          <div className="border-t border-slate-50 mx-2"></div>
                          <button
                            onClick={() => setCardFrozen(!cardFrozen)}
                            className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors"
                          >
                            <div className="flex items-center text-slate-700">
                              <Lock
                                className={`w-5 h-5 mr-3 ${
                                  cardFrozen
                                    ? "text-indigo-500"
                                    : "text-slate-400"
                                }`}
                              />
                              <span className="text-sm font-semibold">
                                {cardFrozen ? "Unfreeze Card" : "Freeze Card"}
                              </span>
                            </div>
                            <div
                              className={`w-10 h-6 rounded-full p-1 transition-colors ${
                                cardFrozen ? "bg-indigo-500" : "bg-slate-200"
                              }`}
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                                  cardFrozen ? "translate-x-4" : "translate-x-0"
                                }`}
                              ></div>
                            </div>
                          </button>
                          <div className="border-t border-slate-50 mx-2"></div>
                          <button className="w-full flex items-center p-3 hover:bg-rose-50 rounded-xl transition-colors group">
                            <XCircle className="w-5 h-5 mr-3 text-rose-400 group-hover:text-rose-500" />
                            <span className="text-sm font-semibold text-rose-500">
                              Cancel Card
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* PHYSICAL CARD SECTION */}
                      <div>
                        <h3 className="font-bold text-slate-900 mb-3 text-sm px-1">
                          Physical Card
                        </h3>

                        {selectedEmployee.physicalCardOrdered ? (
                          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center space-x-4 animate-in slide-in-from-bottom-2">
                            <div className="w-16 h-10 bg-slate-800 rounded flex items-center justify-center relative overflow-hidden">
                              <div className="absolute w-20 h-20 bg-slate-700 rounded-full -top-10 -right-10 opacity-50"></div>
                              <span className="text-[6px] text-white font-bold tracking-widest relative z-10">
                                UNITY
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-sm text-slate-800">
                                Standard Black Card
                              </p>
                              <p className="text-xs text-amber-600 font-medium flex items-center mt-0.5">
                                <Truck className="w-3 h-3 mr-1" /> In Transit
                              </p>
                            </div>
                            <button className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">
                              Track
                            </button>
                          </div>
                        ) : (
                          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-center">
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3">
                              <CreditCard className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-sm text-slate-800 mb-1">
                              Need a physical card?
                            </h4>
                            <p className="text-xs text-slate-500 mb-4 px-2">
                              Order a sleek black Unity card for in-store
                              purchases and ATM withdrawals.
                            </p>
                            <button
                              onClick={handleOrderPhysicalCard}
                              disabled={isOrderingCard}
                              className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl text-sm shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center"
                            >
                              {isOrderingCard ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4 mr-2" />
                              )}
                              {isOrderingCard
                                ? "Processing Order..."
                                : "Order for R 120.00"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* --- MOBILE VAULT TAB --- */
                  <div className="flex-1 bg-slate-50 flex flex-col animate-in slide-in-from-right-2">
                    <div className="bg-indigo-600 px-6 pt-4 pb-8 rounded-b-3xl shadow-md text-white">
                      <h2 className="text-2xl font-bold flex items-center mt-2">
                        <FolderLock className="w-6 h-6 mr-2 opacity-80" /> My
                        Vault
                      </h2>
                      <p className="text-indigo-100 text-sm mt-1 opacity-90">
                        Your secure HR and financial documents.
                      </p>
                    </div>

                    <div className="p-5 -mt-6 space-y-4">
                      {/* Payslips Section */}
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm flex items-center">
                          <FileText className="w-4 h-4 mr-1.5 text-slate-400" />{" "}
                          Recent Payslips
                        </h3>
                        <div className="space-y-3">
                          {payslipsGenerated ? (
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-semibold text-sm text-slate-800">
                                    March 2026
                                  </p>
                                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                                    Net: R{" "}
                                    {selectedEmployee.net.toLocaleString(
                                      "en-ZA",
                                      { minimumFractionDigits: 2 }
                                    )}
                                  </p>
                                </div>
                              </div>
                              <button className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-600 border border-slate-200">
                                <Download className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-xl">
                              <p className="text-xs text-slate-400">
                                Awaiting March payroll run.
                              </p>
                            </div>
                          )}
                          <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded bg-slate-100 text-slate-500 flex items-center justify-center mr-3">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-slate-800">
                                  February 2026
                                </p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                                  Net: R{" "}
                                  {(
                                    selectedEmployee.base * 0.82
                                  ).toLocaleString("en-ZA", {
                                    minimumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            </div>
                            <button className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-600 border border-slate-200">
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Tax Certificates */}
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm flex items-center">
                          <ShieldCheck className="w-4 h-4 mr-1.5 text-slate-400" />{" "}
                          Tax Certificates
                        </h3>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-800">
                                IRP5 - 2025/2026
                              </p>
                              <p className="text-[10px] text-emerald-600 font-medium">
                                SARS Ready
                              </p>
                            </div>
                          </div>
                          <button className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-600 border border-slate-200">
                            <Download className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Bottom Nav (Disabled visually if KYC pending) */}
                <div className="h-16 bg-white border-t border-slate-100 flex justify-around items-center px-2 pb-1 absolute bottom-0 w-full z-20">
                  <button
                    disabled={selectedEmployee.fica !== "verified"}
                    onClick={() => setEmployeeTab("home")}
                    className={`flex flex-col items-center justify-center w-14 h-full ${
                      selectedEmployee.fica !== "verified"
                        ? "opacity-30 cursor-not-allowed"
                        : employeeTab === "home"
                        ? "text-emerald-500"
                        : "text-slate-400"
                    }`}
                  >
                    <Wallet
                      className={`w-5 h-5 mb-1 ${
                        employeeTab === "home" &&
                        selectedEmployee.fica === "verified"
                          ? "fill-emerald-50"
                          : ""
                      }`}
                    />
                    <span className="text-[9px] font-semibold">Wallet</span>
                  </button>
                  <button
                    disabled={selectedEmployee.fica !== "verified"}
                    onClick={() => setEmployeeTab("cards")}
                    className={`flex flex-col items-center justify-center w-14 h-full ${
                      selectedEmployee.fica !== "verified"
                        ? "opacity-30 cursor-not-allowed"
                        : employeeTab === "cards"
                        ? "text-emerald-500"
                        : "text-slate-400"
                    }`}
                  >
                    <CreditCard
                      className={`w-5 h-5 mb-1 ${
                        employeeTab === "cards" &&
                        selectedEmployee.fica === "verified"
                          ? "text-emerald-500"
                          : ""
                      }`}
                    />
                    <span className="text-[9px] font-semibold">Cards</span>
                  </button>
                  <button
                    disabled={selectedEmployee.fica !== "verified"}
                    onClick={() => setEmployeeTab("vault")}
                    className={`flex flex-col items-center justify-center w-14 h-full ${
                      selectedEmployee.fica !== "verified"
                        ? "opacity-30 cursor-not-allowed"
                        : employeeTab === "vault"
                        ? "text-indigo-600"
                        : "text-slate-400"
                    }`}
                  >
                    <FolderLock
                      className={`w-5 h-5 mb-1 ${
                        employeeTab === "vault" &&
                        selectedEmployee.fica === "verified"
                          ? "fill-indigo-50"
                          : ""
                      }`}
                    />
                    <span className="text-[9px] font-semibold">Vault</span>
                  </button>
                  <button
                    disabled
                    className="flex flex-col items-center justify-center w-14 h-full text-slate-400 opacity-30 cursor-not-allowed"
                  >
                    <Users className="w-5 h-5 mb-1" />
                    <span className="text-[9px] font-semibold">Profile</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
