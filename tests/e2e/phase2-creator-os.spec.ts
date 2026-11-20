import {expect,test} from "@playwright/test";

const email=process.env.DEGAMETV_E2E_CREATOR_EMAIL;
const password=process.env.DEGAMETV_E2E_CREATOR_PASSWORD;
const adminEmail=process.env.DEGAMETV_E2E_ADMIN_EMAIL;
const adminPassword=process.env.DEGAMETV_E2E_ADMIN_PASSWORD;
const appUrl=process.env.DEGAMETV_E2E_BASE_URL??"http://127.0.0.1:5173";

test("creator onboarding surface requires an authenticated session",async({page})=>{
 await page.goto("/creator/onboarding");
 await expect(page).toHaveURL(/auth|creator\/onboarding/);
});

test("ordinary user can submit a creator application and an administrator can review it",async({page,browser})=>{
 test.skip(!email||!password||!adminEmail||!adminPassword,"Dedicated creator and God Mode test accounts are required.");
 await page.goto("/auth");
 await page.locator("#email").fill(email!);await page.locator("#password").fill(password!);
 await page.getByRole("button",{name:"Sign In",exact:true}).click();
 await page.goto("/creator/onboarding");
 await expect(page.getByRole("heading",{name:"Become a creator"})).toBeVisible();
 await page.getByLabel("Public display name").fill("Phase 2 E2E Creator");
 await page.getByLabel("Legal name").fill("Phase 2 E2E Legal Entity");
 await page.getByLabel("Identity verification record ID").fill(process.env.DEGAMETV_E2E_IDENTITY_VERIFICATION_ID??"");
 test.skip(!process.env.DEGAMETV_E2E_IDENTITY_VERIFICATION_ID,"A verified identity evidence fixture is required.");
 await page.getByRole("button",{name:"Submit for verification"}).click();
 await expect(page.getByRole("status")).toContainText("Application submitted",{timeout:30000});
 const admin=await browser.newPage();
 await admin.goto(appUrl+"/auth");await admin.locator("#email").fill(adminEmail!);await admin.locator("#password").fill(adminPassword!);
 await admin.getByRole("button",{name:"Sign In",exact:true}).click();await admin.goto("/admin/godmode");
 await expect(admin.getByText(/Creator verification/i).first()).toBeVisible({timeout:30000});
 await admin.getByRole("button",{name:"Approve",exact:true}).first().click();
 await expect(admin.getByText(/No cases|No applications/i)).toHaveCount(0,{timeout:1000}).catch(()=>undefined);
 await page.goto("/studio/create");
 await expect(page.getByLabel("Title")).toBeVisible({timeout:30000});
 await page.getByLabel("Title").fill("Phase 2 E2E Production "+Date.now());
 await page.getByLabel("Duration (mins)").fill("90");
 const country=page.getByLabel("Production country");
 await country.click();
 await page.getByRole("option",{name:/Nigeria/}).click();
 await page.getByRole("button",{name:/Next/}).click();
 await page.getByLabel("Distribution rights scope").click();
 await page.getByRole("option").first().click();
 await page.getByLabel("Admission price").fill("0");
 await page.getByRole("button",{name:/Save draft \/ Publish/}).click();
 await expect(page.getByText(/Draft saved|Published to Studio/).first()).toBeVisible({timeout:30000});
});

test("a configured production hostname resolves to the native storefront",async({page})=>{
 const hostname=process.env.DEGAMETV_E2E_STOREFRONT_HOST;
 test.skip(!hostname,"Set DEGAMETV_E2E_STOREFRONT_HOST to a verified test domain.");
 await page.goto("https://"+hostname);
 await expect(page.getByText("Official production storefront")).toBeVisible({timeout:30000});
 const tickets=page.getByRole("button",{name:"Get tickets",exact:true});
 const watch=page.getByRole("button",{name:"Watch / Details",exact:true});
 if(await tickets.count()){await expect(tickets).toBeEnabled();await tickets.click();await expect(page).toHaveURL(/\\/buy\\//);}
 else {await expect(watch).toBeVisible();await watch.click();await expect(page).toHaveURL(/\\/content\\//);}
});