# Stage 1: Builder
FROM node:24-alpine AS builder
WORKDIR /app

# ติดตั้ง dependencies สำหรับการ Build เท่านั้น
COPY package*.json ./
RUN npm install

COPY . .

# ปิด Telemetry เพื่อความเร็วและความเป็นส่วนตัว
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_GOOGLE_API_KEY
ARG NEXT_PUBLIC_RAG_API_KEY

ENV NEXT_PUBLIC_GOOGLE_API_KEY=$NEXT_PUBLIC_GOOGLE_API_KEY
ENV NEXT_PUBLIC_RAG_API_KEY=$NEXT_PUBLIC_RAG_API_KEY


RUN npm run build

# Stage 2: Runner (Image จะเล็กลงมาก)
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# สร้าง User เพื่อความปลอดภัย (ไม่รันด้วย root)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# COPY ไฟล์เฉพาะที่จำเป็นจาก Standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# ตั้งค่าสิทธิ์ไฟล์
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000



# รันด้วย node โดยตรง ไม่ต้องผ่าน npm หรือ package.json
CMD ["node", "server.js"]