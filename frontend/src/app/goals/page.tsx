"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle,
  DollarSign,
  Lightbulb,
  Plus,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";

import { Card, StatCard } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/cn";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  createdAt: string;
}

const PRESET_GOALS = [
  { name: "Emergency Fund", targetAmount: 10000, description: "6 months of expenses" },
  { name: "First $50K Portfolio", targetAmount: 50000, description: "Major milestone" },
  { name: "$100K Milestone", targetAmount: 100000, description: "Six figures!" },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "",
    deadline: "",
  });

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("investment-goals");
      if (stored) {
        setGoals(JSON.parse(stored));
      }
    } catch {
      setGoals([]);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (goals.length > 0) {
      localStorage.setItem("investment-goals", JSON.stringify(goals));
    } else {
      localStorage.removeItem("investment-goals");
    }
  }, [goals]);

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.targetAmount || !formData.deadline) return;

    const newGoal: Goal = {
      id: Date.now().toString(),
      name: formData.name,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount) || 0,
      deadline: formData.deadline,
      createdAt: new Date().toISOString(),
    };

    setGoals([...goals, newGoal]);
    setFormData({ name: "", targetAmount: "", currentAmount: "", deadline: "" });
    setShowForm(false);
  };

  const addPreset = (preset: (typeof PRESET_GOALS)[0]) => {
    const deadline = new Date();
    deadline.setFullYear(deadline.getFullYear() + 2);

    setFormData({
      name: preset.name,
      targetAmount: preset.targetAmount.toString(),
      currentAmount: "0",
      deadline: deadline.toISOString().split("T")[0],
    });
    setShowForm(true);
  };

  const updateCurrentAmount = (id: string, amount: number) => {
    setGoals(
      goals.map((g) => (g.id === id ? { ...g, currentAmount: Math.max(0, amount) } : g))
    );
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter((g) => g.id !== id));
  };

  // Calculate overall stats
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
  const completedGoals = goals.filter((g) => g.currentAmount >= g.targetAmount).length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Goal Tracker"
        description="Set target investasi dan track progress menuju tujuan finansial kamu."
        badge="New"
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-xl bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/25"
          >
            <Plus size={14} />
            Add Goal
          </button>
        }
      />

      {/* Stats Overview */}
      {goals.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Target"
            value={`$${totalTarget.toLocaleString()}`}
            change={`${goals.length} goal${goals.length > 1 ? "s" : ""}`}
            changeType="neutral"
            icon={<Target size={16} />}
          />
          <StatCard
            label="Current Progress"
            value={`$${totalCurrent.toLocaleString()}`}
            change={`${overallProgress}% of target`}
            changeType={overallProgress >= 50 ? "bull" : "neutral"}
            icon={<DollarSign size={16} />}
          />
          <StatCard
            label="Remaining"
            value={`$${Math.max(0, totalTarget - totalCurrent).toLocaleString()}`}
            change="to reach all goals"
            changeType="neutral"
            icon={<TrendingUpIcon size={16} />}
          />
          <StatCard
            label="Completed"
            value={`${completedGoals}/${goals.length}`}
            change={completedGoals > 0 ? "Great progress!" : "Keep going!"}
            changeType={completedGoals > 0 ? "bull" : "neutral"}
            icon={<Trophy size={16} />}
          />
        </div>
      )}

      {/* Add Goal Form */}
      {showForm && (
        <Card title="Create New Goal" icon={<Plus size={14} />}>
          <form onSubmit={addGoal} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Goal Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Emergency Fund"
                  className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50 focus:bg-muted/30"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Target Amount ($)
                </label>
                <input
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  placeholder="10000"
                  min="1"
                  className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50 focus:bg-muted/30"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Current Amount ($)
                </label>
                <input
                  type="number"
                  value={formData.currentAmount}
                  onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50 focus:bg-muted/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Deadline
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/50 focus:bg-muted/30"
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Create Goal
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-border/50 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted/30"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Preset Goals */}
      {goals.length === 0 && !showForm && (
        <Card
          title="Quick Start — Preset Goals"
          subtitle="Choose a popular investment goal to get started"
          icon={<Target size={14} />}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {PRESET_GOALS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => addPreset(preset)}
                className="group rounded-xl border border-border/30 bg-muted/10 p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex items-center gap-2">
                  <Trophy size={14} className="text-primary" />
                  <span className="text-sm font-semibold">{preset.name}</span>
                </div>
                <p className="mt-1 text-lg font-bold text-primary">
                  ${preset.targetAmount.toLocaleString()}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">{preset.description}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Goals List */}
      {goals.length > 0 && (
        <section className="space-y-4">
          {goals.map((goal) => {
            const progress = Math.min(
              100,
              Math.round((goal.currentAmount / goal.targetAmount) * 100)
            );
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const deadlineDate = new Date(goal.deadline);
            const now = new Date();
            const monthsLeft = Math.max(
              0,
              Math.ceil(
                (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
              )
            );
            const monthlySavings = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining;
            const isCompleted = goal.currentAmount >= goal.targetAmount;
            const isOverdue = deadlineDate < now && !isCompleted;

            return (
              <Card key={goal.id} className="overflow-hidden">
                <div className="p-4 sm:p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl",
                          isCompleted
                            ? "bg-bull/15 text-bull"
                            : isOverdue
                              ? "bg-bear/15 text-bear"
                              : "bg-primary/15 text-primary"
                        )}
                      >
                        {isCompleted ? <CheckCircle size={20} /> : <Target size={20} />}
                      </div>
                      <div>
                        <h3 className="font-semibold">{goal.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Deadline: {deadlineDate.toLocaleDateString()}
                          </span>
                          {isCompleted && (
                            <Badge variant="bull" dot>
                              Completed!
                            </Badge>
                          )}
                          {isOverdue && (
                            <Badge variant="bear" dot>
                              Overdue
                            </Badge>
                          )}
                          {!isCompleted && !isOverdue && monthsLeft <= 3 && (
                            <Badge variant="warning" dot>
                              {monthsLeft} month{monthsLeft !== 1 ? "s" : ""} left
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-bear/10 hover:text-bear"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold tabular">
                        ${goal.currentAmount.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground tabular">
                        ${goal.targetAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 h-4 overflow-hidden rounded-full bg-muted/50">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          isCompleted
                            ? "bg-gradient-to-r from-bull to-emerald-400"
                            : progress >= 50
                              ? "bg-gradient-to-r from-primary to-accent"
                              : "bg-primary"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{progress}% complete</span>
                      <span className="text-xs text-muted-foreground">
                        ${remaining.toLocaleString()} remaining
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  {!isCompleted && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-border/20 bg-muted/10 p-3">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Monthly Savings Needed
                        </span>
                        <p className="mt-1 text-lg font-bold text-primary tabular">
                          ${monthlySavings.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/20 bg-muted/10 p-3">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Time Remaining
                        </span>
                        <p className="mt-1 text-lg font-bold tabular">
                          {monthsLeft} month{monthsLeft !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/20 bg-muted/10 p-3">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Suggestion
                        </span>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Invest ${monthlySavings.toLocaleString()}/month to reach your goal
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Update Amount */}
                  {!isCompleted && (
                    <div className="mt-4 flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Update progress:</label>
                      <input
                        type="number"
                        value={goal.currentAmount}
                        onChange={(e) =>
                          updateCurrentAmount(goal.id, parseFloat(e.target.value) || 0)
                        }
                        min="0"
                        max={goal.targetAmount * 2}
                        className="w-32 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 text-sm tabular outline-none focus:border-primary/50"
                      />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </section>
      )}

      {/* Tips Section */}
      {goals.length > 0 && (
        <Card
          title="Investment Tips"
          subtitle="Suggestions to reach your goals faster"
          icon={<Lightbulb size={14} />}
        >
          <div className="space-y-2">
            <TipItem text="Set up automatic monthly transfers to your investment account on payday." />
            <TipItem text="Start with index funds (SPY, QQQ) for steady long-term growth." />
            <TipItem text="Reinvest dividends to compound your returns over time." />
            <TipItem text="Review and adjust your goals quarterly based on life changes." />
            {overallProgress < 25 && (
              <TipItem text="Consider starting with smaller, achievable goals to build momentum." />
            )}
            {overallProgress >= 75 && (
              <TipItem text="You're almost there! Stay consistent and avoid withdrawing early." />
            )}
          </div>
        </Card>
      )}

      {/* Footer */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 p-5">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Note:</strong> Goal data is stored locally in your browser.
          Clearing browser data will remove your goals. This is for planning purposes only and does not
          constitute financial advice.
        </p>
      </div>
    </div>
  );
}

function TipItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3">
      <Lightbulb size={14} className="mt-0.5 shrink-0 text-primary" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

function TrendingUpIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
