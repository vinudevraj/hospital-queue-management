Build a production-quality hackathon web application called Turnwell — an intelligent patient flow and clinic queue management platform that reduces waiting room congestion and helps patients spend less time sitting at clinics.

The design must feel like a funded healthcare startup, not a student project.

Design Language

Use this exact color palette inspired by the reference image:

Background Light Blue: #DDEEF8
Soft Sky Blue: #A8CDE5
Muted Blue: #7FB0CB
Teal Blue: #3F8EAC
Warm Medical Red: #B74A42
Deep Slate: #283040

The entire application should use the light blue background (#DDEEF8) as the primary page background, similar to the uploaded reference image.

Visual style:

Bright, clean, modern
Soft shadows
Rounded corners (16–24px)
Glassmorphism cards with subtle blur
Plenty of whitespace
Minimalistic healthcare startup aesthetic
Friendly illustrations and icons
No dark mode
No generic hospital stock photos
No navy blue healthcare templates
No neon cyberpunk effects
Premium SaaS feel

Typography:

Inter
Clean hierarchy
Large bold headings
Elegant spacing
Product Overview

Product Name: Turnwell

Tagline:

"Healthcare that knows when it's your turn."

Purpose:

Turnwell helps clinics manage patient queues in real time while allowing patients to wait comfortably outside the waiting room and receive accurate updates on when to return.

Pages Required
1. Landing Page

Hero section:

Headline:

"Stop Waiting. Start Living."

Subheadline:

"Real-time clinic queues, intelligent wait predictions, and return-when-ready notifications."

Buttons:

Book Demo
View Live Queue

Include:

Animated queue visualization
Floating healthcare illustrations
Statistics section
Testimonials
Features section
How It Works section
CTA section
2. Reception Dashboard

Features:

Register patient
Generate token
Assign doctor
Mark emergency patient
Call next patient
Skip patient
Complete consultation
Search patient

Dashboard widgets:

Active Queue
Patients Waiting
Average Wait Time
Patients Served Today

Queue table:

Token
Patient Name
Doctor
Status
ETA

Realtime updates.

3. Patient Tracking Portal

Patient enters:

Token Number

Shows:

Current Status

People Ahead

Estimated Wait Time

Doctor Assigned

Queue Progress

Visual timeline:

Current Consultation

Waiting

Your Turn

Completed

Large clean interface optimized for mobile devices.

4. Smart ETA Prediction Page

Display:

Current Queue Analytics

Average Consultation Time

Predicted Wait Time

Queue Congestion Level

Insights:

"Current wait time is 23% lower than average."

Charts:

Queue Length Trend
Hourly Patient Volume
Wait Time Analysis
5. Multi-Doctor Queue View

Cards for each doctor:

Doctor Name

Patients Waiting

Average Consultation Duration

Estimated Queue Time

Availability Status

Allow comparison between doctors.

6. Analytics Dashboard

Professional executive dashboard.

Metrics:

Total Patients Today
Average Wait Time
Queue Efficiency Score
Peak Hours
Missed Appointments
Emergency Cases

Charts:

Daily Traffic
Weekly Trends
Queue Performance
Consultation Duration Distribution

Beautiful interactive visualizations.

Core Features
Real-Time Queue Engine

When receptionist clicks:

"Call Next Patient"

all patient screens update instantly.

Use:

Firebase Firestore realtime listeners.

QR-Based Queue Access

Every token generates:

Unique QR Code

Patients scan and instantly view queue status.

Near-Turn Alert System

When only 3 patients remain:

Display notification:

"Your turn is approaching. Please return to the clinic."

Notification center UI included.

Priority Queue Management

Emergency patients automatically move ahead.

Visual badge:

Emergency Priority

Red accent color.

Queue Timeline Visualization

Instead of showing only token numbers.

Show:

Current Patient

Patients Ahead

Upcoming Turn

Completed Patients

Use beautiful horizontal progress timeline.

AI Features

Create an AI-powered Wait Prediction Engine.

Inputs:

Historical queue data
Doctor consultation speed
Queue size
Emergency cases
No-show rates

Outputs:

Accurate ETA prediction
Congestion forecasting
Peak hour detection

Display AI confidence score.

Keep realistic and hackathon-friendly.

UI Components

Create:

Floating metric cards
Interactive charts
Modern tables
Timeline component
QR code component
Notification cards
Glassmorphism panels
Animated counters
Doctor cards
Queue cards

Use subtle micro-interactions.

Smooth hover effects.

Technical Requirements

Frontend:

Next.js 15
React
TailwindCSS
TypeScript

Backend:

FastAPI

Database:

Firebase Firestore

Charts:

Recharts

Icons:

Lucide React

Authentication:

Firebase Auth

Deployment Ready:

Vercel
Demo Data

Populate with realistic sample data:

Doctors:

Dr. Mehta
Dr. Sharma
Dr. Patel

Patients:

25+ sample entries

Queue:

Active tokens
Completed consultations
Emergency cases

Analytics:

Realistic charts and metrics
Animations

Add:

Smooth page transitions
Animated queue updates
Counter animations
Card hover effects
Loading skeletons
QR generation animation

Keep professional and subtle.

Final Goal

The final result should look like a real startup product that could be deployed in clinics immediately, capable of winning a healthcare hackathon. The UI should be visually stunning, investor-demo ready, mobile responsive, highly polished, and consistently use the provided light-blue healthcare palette throughout the entire application.