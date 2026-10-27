import { notFound, redirect } from "next/navigation";
import { getAccess, hasPermission } from "@/lib/rbac/server";
import { getSection, canAccessSection, getLandingSection, getAllowedSections } from "@/lib/portal/sections";
import { getSettings } from "@/lib/settings";
import prisma from "@/lib/prisma";
import { toOrderDTO } from "@/lib/commerce/dto";
import { loadCustomerData } from "@/lib/portal/customer-data";
import { loadAmbassadorData, loadLatestApplication } from "@/lib/portal/ambassador-data";
import { loadTickets, loadTicketStats, loadTicketAgents } from "@/lib/portal/tickets";
import { loadCatalogAdmin } from "@/lib/portal/catalog-admin";
import { loadUsersAdmin } from "@/lib/portal/users-admin";
import { loadAmbassadorsAdmin } from "@/lib/portal/ambassadors-admin";
import {
  loadCoupons,
  loadNotificationsAdmin,
  loadAuditLogs,
  loadOverview,
  loadSampleKitsAdmin,
  loadAbandonedCheckouts,
  loadFinance,
  loadIntegrationStatus,
} from "@/lib/portal/admin-loaders";

import CustomerArea, { type CustomerView } from "@/components/portal/customer/CustomerArea";
import AmbassadorArea, { type AmbassadorView } from "@/components/portal/ambassador/AmbassadorArea";
import BecomeAmbassador from "@/components/portal/ambassador/BecomeAmbassador";
import TicketsBoard from "@/components/portal/TicketsBoard";
import SectionTabs from "@/components/portal/SectionTabs";
import { PageTitle, SampleDataBanner } from "@/components/portal/ui";
import OverviewAdmin from "@/components/portal/admin/OverviewAdmin";
import OrdersAdmin from "@/components/portal/admin/OrdersAdmin";
import CatalogAdmin from "@/components/portal/admin/CatalogAdmin";
import UsersAdmin from "@/components/portal/admin/UsersAdmin";
import ContactsAdmin from "@/components/portal/admin/ContactsAdmin";
import ChatAdmin from "@/components/portal/admin/ChatAdmin";
import { loadChannels, loadChatPeople } from "@/lib/chat";
import { loadContacts, loadContactDetail, loadStaffOptions } from "@/lib/crm/contacts";
import { SUPER_ADMIN_ROLE } from "@/lib/rbac/permissions";
import AmbassadorsAdmin from "@/components/portal/admin/AmbassadorsAdmin";
import CouponsAdmin from "@/components/portal/admin/CouponsAdmin";
import SettingsAdmin from "@/components/portal/admin/SettingsAdmin";
import AuditAdmin from "@/components/portal/admin/AuditAdmin";
import SampleKitsAdmin from "@/components/portal/admin/SampleKitsAdmin";
import AbandonedAdmin from "@/components/portal/admin/AbandonedAdmin";
import FinanceAdmin, { ExpensesAdmin } from "@/components/portal/admin/FinanceAdmin";
// ماژول‌هایی که هنوز داده نمونه دارند (با برچسب «داده نمونه» نمایش داده می‌شوند)
import BannersCampaignManager from "@/components/admin/BannersCampaignManager";
import ClinicalCaseStudiesManager from "@/components/admin/ClinicalCaseStudiesManager";
import CostingAdmin from "@/components/portal/admin/CostingAdmin";
import { loadCosting } from "@/lib/portal/costing";
import { loadLiveChats } from "@/lib/livechat";
import { loadFollowUps } from "@/lib/crm/followups";
import FollowUpsAdmin from "@/components/portal/admin/FollowUpsAdmin";
import LiveChatInbox from "@/components/portal/admin/LiveChatInbox";
import { moduleToken } from "@/lib/modules/registry";
import { loadModulesAdmin } from "@/lib/modules/admin";
import ModulesAdmin from "@/components/portal/admin/ModulesAdmin";
import RefillsAdmin from "@/components/portal/admin/RefillsAdmin";
import { loadRefillsAdmin } from "@/lib/commerce/refill";
import { CONSULT_GOALS, consultEligibility } from "@/lib/consult";
import SalesReportAdmin from "@/components/portal/admin/SalesReportAdmin";
import { loadSalesReport } from "@/lib/portal/sales-report";
import CampaignsAdmin from "@/components/portal/admin/CampaignsAdmin";
import { loadCampaigns } from "@/lib/marketing/campaigns";
import ReviewsAdmin from "@/components/portal/admin/ReviewsAdmin";
import { loadReviewsAdmin } from "@/lib/portal/reviews";
import ArticlesAdmin from "@/components/portal/admin/ArticlesAdmin";
import { loadArticlesAdmin } from "@/lib/content/articles";
import HealthAdmin from "@/components/portal/admin/HealthAdmin";
import { lastHealth } from "@/lib/monitoring";
import { loadWarehouses } from "@/lib/commerce/warehouses";
import WholesalePortal from "@/components/portal/wholesale/WholesalePortal";
import { loadWholesaleData } from "@/lib/portal/wholesale";

export const dynamic = "force-dynamic";

// آدرس‌های قدیمی پنل‌ها به بخش‌های جدید
const LEGACY: Record<string, string> = {
  admin: "overview",
  customer: "home",
  "concept-previews": "overview",
  points: "wallet",
};

const CUSTOMER_VIEWS: CustomerView[] = ["home", "my-orders", "wallet", "addresses", "profile"];
const AMBASSADOR_VIEWS: AmbassadorView[] = [
  "ambassador",
  "ambassador-links",
  "ambassador-referrals",
  "ambassador-samples",
  "ambassador-settlements",
];

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const s = getSection(section);
  return { title: s ? `${s.label} | اسپیرولینا مایا` : "پنل کاربری | اسپیرولینا مایا" };
}

export default async function PortalSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section: id } = await params;
  const query = await searchParams;
  const access = await getAccess();
  if (!access) redirect(`/login?redirect=/portal/${id}`);

  if (LEGACY[id]) redirect(`/portal/${LEGACY[id]}`);
  const section = getSection(id);
  if (!section) notFound();
  if (!canAccessSection(section, access.tokens)) redirect(`/portal/${getLandingSection(access.tokens)}`);

  const can = (...p: Parameters<typeof hasPermission>[1][]) => hasPermission(access, ...p);

  if ((CUSTOMER_VIEWS as string[]).includes(id)) {
    return <CustomerArea view={id as CustomerView} data={await loadCustomerData(access.userId)} />;
  }
  if ((AMBASSADOR_VIEWS as string[]).includes(id)) {
    return <AmbassadorArea view={id as AmbassadorView} data={await loadAmbassadorData(access.userId)} />;
  }

  switch (id) {
    case "ambassador-profile":
      return <CustomerArea view="profile" data={await loadCustomerData(access.userId)} />;

    case "my-tickets":
    case "ambassador-tickets":
      return <TicketsBoard tickets={await loadTickets({ userId: access.userId })} staff={false} />;

    case "my-consultations": {
      const [tickets, eligibility] = await Promise.all([loadTickets({ userId: access.userId, kind: "CONSULTATION" }), consultEligibility(access.userId)]);
      return (
        <TicketsBoard
          staff={false}
          kind="CONSULTATION"
          tickets={tickets}
          consult={{ canRequest: eligibility.canRequest, reason: eligibility.reason, responseHours: eligibility.responseHours, goals: [...CONSULT_GOALS] }}
        />
      );
    }

    case "consultations": {
      // مدیر مشاوره همه درخواست‌ها را می‌بیند و ارجاع می‌دهد؛ مشاور فقط درخواست‌های خودش و ارجاع‌نشده‌ها
      const manager = can("consult.manage");
      const agentId = manager ? undefined : access.userId;
      const [tickets, stats, agents] = await Promise.all([
        loadTickets({ kind: "CONSULTATION", agentId }),
        loadTicketStats("CONSULTATION", agentId),
        manager ? loadTicketAgents("CONSULTATION") : Promise.resolve([{ id: access.userId, name: access.name ?? access.phone }]),
      ]);
      return <TicketsBoard staff kind="CONSULTATION" tickets={tickets} stats={stats} agents={agents} linkContacts={can("users.view")} />;
    }

    case "modules":
      return <ModulesAdmin data={await loadModulesAdmin()} />;

    case "articles":
      return <ArticlesAdmin articles={await loadArticlesAdmin()} />;

    case "health":
      return <HealthAdmin last={lastHealth()} telegramReady={Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID)} />;

    case "wholesale":
      return <WholesalePortal data={await loadWholesaleData(access.userId)} />;

    case "refills":
      return <RefillsAdmin data={await loadRefillsAdmin()} linkContacts={can("users.view")} />;

    case "become-ambassador": {
      const [application, s] = await Promise.all([loadLatestApplication(access.userId), getSettings()]);
      return (
        <BecomeAmbassador
          name={access.name ?? ""}
          application={application}
          commission={{
            silver: Number(s.COMMISSION_SILVER),
            gold: Number(s.COMMISSION_GOLD),
            diamond: Number(s.COMMISSION_DIAMOND),
            customerDiscount: Number(s.AMBASSADOR_CUSTOMER_DISCOUNT),
          }}
        />
      );
    }

    case "overview":
      return <OverviewAdmin data={await loadOverview()} allowed={getAllowedSections(access.tokens).map((s) => s.id)} />;

    case "messages": {
      const moderator = can("chat.moderate");
      const [channels, people] = await Promise.all([loadChannels(access.userId, moderator), loadChatPeople()]);
      const selectedId = typeof query.c === "string" && channels.some((c) => c.id === query.c) ? query.c : (channels[0]?.id ?? null);
      return (
        <ChatAdmin
          channels={channels}
          people={people}
          selfId={access.userId}
          selectedId={selectedId}
          perms={{ canCreateGroup: can("chat.groups.create"), canModerate: moderator, blocked: access.chatBlocked }}
        />
      );
    }

    case "orders": {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
        include: { items: true, referrer: { select: { name: true } }, review: true, returnRequest: true },
      });
      // انبار پیش‌فرض اول، تا انتخاب پیش‌فرض ارسال همان باشد
      const warehouses = access.tokens.includes(moduleToken("warehouses"))
        ? await prisma.warehouse.findMany({ where: { isActive: true }, orderBy: [{ isDefault: "desc" }, { name: "asc" }], select: { id: true, name: true } })
        : [];
      return <OrdersAdmin orders={orders.map(toOrderDTO)} canManage={can("orders.manage")} initialQuery={typeof query.q === "string" ? query.q : ""} warehouses={warehouses} />;
    }

    case "sales-report": {
      const days = [30, 90, 365].includes(Number(query.days)) ? Number(query.days) : 90;
      return <SalesReportAdmin data={await loadSalesReport(days)} />;
    }

    case "campaigns":
      return <CampaignsAdmin data={await loadCampaigns()} />;

    case "reviews":
      return <ReviewsAdmin data={await loadReviewsAdmin()} canOpenContacts={can("users.view")} />;

    case "abandoned":
      return <AbandonedAdmin rows={await loadAbandonedCheckouts()} />;

    case "catalog": {
      const data = await loadCatalogAdmin();
      return (
        <CatalogAdmin
          products={data.products}
          batches={data.batches}
          perms={{ canEditProducts: can("products.manage"), canManageInventory: can("inventory.manage") }}
          trace={access.tokens.includes(moduleToken("trace"))}
          warehouses={access.tokens.includes(moduleToken("warehouses")) ? await loadWarehouses() : null}
        />
      );
    }

    case "ambassadors": {
      const data = await loadAmbassadorsAdmin();
      return (
        <AmbassadorsAdmin
          {...data}
          perms={{ canManage: can("ambassadors.manage"), canApproveSettlements: can("settlements.approve") }}
        />
      );
    }

    case "samplekits":
      return <SampleKitsAdmin kits={await loadSampleKitsAdmin()} />;

    case "promotions":
      return (
        <div className="space-y-5">
          <PageTitle title="تخفیف و کمپین" subtitle="کد تخفیف در صفحه پرداخت اعتبارسنجی و با تخفیف سفیر مقایسه می‌شود." />
          <SectionTabs
            tabs={[
              { id: "coupons", label: "کدهای تخفیف", content: <CouponsAdmin coupons={await loadCoupons()} /> },
              {
                id: "banners",
                label: "بنرها و کمپین‌ها",
                content: (
                  <div className="space-y-4">
                    <SampleDataBanner />
                    <BannersCampaignManager />
                  </div>
                ),
              },
            ]}
          />
        </div>
      );

    case "content":
      return (
        <div className="space-y-5">
          <PageTitle title="پرونده‌های بالینی" subtitle="نظرات واقعی خریداران در بخش «نظرات و رضایت خریداران» است." />
          <SampleDataBanner />
          <ClinicalCaseStudiesManager />
        </div>
      );

    case "finance": {
      const finance = await loadFinance();
      return (
        <SectionTabs
          tabs={[
            { id: "pnl", label: "سود و زیان", content: <FinanceAdmin data={finance} invoices={access.modules.includes("invoice")} /> },
            { id: "expenses", label: "هزینه‌ها", content: <ExpensesAdmin data={finance} canManage={can("finance.manage")} /> },
          ]}
        />
      );
    }

    case "costing":
      return <CostingAdmin data={await loadCosting()} selectedId={typeof query.id === "string" ? query.id : null} canPublishPrice={can("products.manage")} />;

    case "followups":
      return <FollowUpsAdmin data={await loadFollowUps(access.userId)} canOpenContacts={can("users.view")} />;

    case "livechat":
    case "consult-livechat": {
      const all = id === "livechat" && can("livechat.answer");
      const initial = await loadLiveChats(all ? "all" : "consultation", access.userId, typeof query.id === "string" ? query.id : null);
      return <LiveChatInbox initial={initial} section={id} consultantOnly={!all} canSeeContacts={can("users.view")} />;
    }

    case "tickets":
    {
      const [tickets, stats, agents] = await Promise.all([loadTickets({}), loadTicketStats(), loadTicketAgents()]);
      return <TicketsBoard staff tickets={tickets} stats={stats} agents={agents} />;
    }

    case "users": {
      const data = await loadUsersAdmin();
      return <UsersAdmin users={data.users} roles={data.roles} perms={{ canManageRoles: can("roles.manage") }} moduleTokens={access.modules.map(moduleToken)} />;
    }

    case "contacts": {
      const contactId = typeof query.id === "string" ? query.id : null;
      const [{ rows, tags }, { roles }, detail, staff] = await Promise.all([
        loadContacts(),
        loadUsersAdmin(),
        contactId ? loadContactDetail(contactId) : null,
        loadStaffOptions(),
      ]);
      return (
        <ContactsAdmin
          rows={rows}
          tags={tags}
          roles={roles}
          detail={detail}
          perms={{
            canManage: can("users.manage"),
            canManageRoles: can("roles.manage"),
            isSuper: access.roleKeys.includes(SUPER_ADMIN_ROLE),
            canModerateChat: can("chat.moderate"),
            canManageAmbassadors: can("ambassadors.manage"),
            canFollowUp: can("crm.followup"),
            meId: access.userId,
            staff,
          }}
        />
      );
    }

    case "settings": {
      // قوانین تجاری هر بخش در «ماژول‌ها و قوانین» ویرایش می‌شوند
      const [settings, notifications] = await Promise.all([
        null,
        can("notifications.manage") ? loadNotificationsAdmin() : null,
      ]);
      return (
        <SettingsAdmin
          settings={settings}
          notifications={notifications}
          integrations={can("settings.manage") ? loadIntegrationStatus() : null}
          perms={{ canManageSettings: can("settings.manage"), canManageNotifications: can("notifications.manage") }}
        />
      );
    }

    case "audit":
      return <AuditAdmin logs={await loadAuditLogs()} />;
  }

  notFound();
}
