import express from "express";
import helmet from "helmet";
import crypto from "node:crypto";

const app = express();
app.use(helmet());
app.use(express.json());

const required = ["APP_SECRET","ML_CLIENT_ID","ML_CLIENT_SECRET","ML_REDIRECT_URI","SHOPIFY_STORE_DOMAIN","SHOPIFY_ADMIN_ACCESS_TOKEN"];
const missing = () => required.filter(key => !process.env[key]);
const sign = value => crypto.createHmac("sha256", process.env.APP_SECRET).update(value).digest("hex");

function calculatePrice(cost) {
  const fee = Number(process.env.MP_FEE_RATE || 0.05);
  const coupon = Number(process.env.COUPON_RATE || 0.10);
  const profit = Number(process.env.MAX_PROFIT_BRL || 15);
  const buffer = Number(process.env.SAFETY_BUFFER_BRL || 3);
  return Math.ceil(((Number(cost) + profit + buffer) / ((1 - coupon) * (1 - fee))) * 10) / 10;
}

async function shopifyGraphQL(query, variables = {}) {
  const response = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2026-07/graphql.json`, {
    method: "POST",
    headers: {"Content-Type":"application/json","X-Shopify-Access-Token":process.env.SHOPIFY_ADMIN_ACCESS_TOKEN},
    body: JSON.stringify({query, variables})
  });
  const body = await response.json();
  if (!response.ok || body.errors) throw new Error("Falha na API Shopify");
  return body.data;
}

app.get("/", (_req,res) => res.json({app:"Hero Beauty Sincronizador de Preços",status:"online",configured:missing().length===0}));
app.get("/health", (_req,res) => res.status(200).send("ok"));

app.get("/auth/mercadolivre", (_req,res) => {
  const nonce = crypto.randomBytes(24).toString("hex");
  const state = `${nonce}.${sign(nonce)}`;
  const url = new URL("https://auth.mercadolivre.com.br/authorization");
  url.searchParams.set("response_type","code");
  url.searchParams.set("client_id",process.env.ML_CLIENT_ID);
  url.searchParams.set("redirect_uri",process.env.ML_REDIRECT_URI);
  url.searchParams.set("state",state);
  res.redirect(url.toString());
});

app.get("/auth/mercadolivre/callback", async (req,res) => {
  const {code,state} = req.query;
  if (!code || !state) return res.status(400).send("Autorização incompleta.");
  const [nonce,signature] = String(state).split(".");
  const expected = sign(nonce || "");
  if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected))) return res.status(400).send("Estado OAuth inválido.");
  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({grant_type:"authorization_code",client_id:process.env.ML_CLIENT_ID,client_secret:process.env.ML_CLIENT_SECRET,code:String(code),redirect_uri:process.env.ML_REDIRECT_URI})
  });
  if (!response.ok) return res.status(502).send("Mercado Livre recusou a autorização.");
  res.send("Mercado Livre autorizado. Próxima etapa: persistência segura do token.");
});

app.get("/api/price-preview",(req,res) => {
  const cost=Number(req.query.cost);
  if (!Number.isFinite(cost)||cost<=0) return res.status(400).json({error:"Custo inválido"});
  res.json({cost,suggestedPrice:calculatePrice(cost)});
});

app.get("/api/shopify/test",async (_req,res) => {
  try { const data=await shopifyGraphQL("query { shop { name myshopifyDomain } }"); res.json(data.shop); }
  catch { res.status(502).json({error:"Não foi possível conectar à Shopify"}); }
});

app.listen(process.env.PORT||3000,()=>console.log("Hero Beauty Preços online"));
