# allwondrous

A standalone, high-quality demo of the allwondrous fitness platform.

## 🎯 Project Overview

This is a **frontend-only demo** showcasing a complete redesign of the Trainer Aide feature for the allwondrous fitness platform. It demonstrates:

- **Studio Owner** workflow: Create and manage workout templates
- **Trainer** workflow: Run training sessions with clients using templates
- **Client** view: View session history and progress

## 🎨 Design Philosophy

- ✅ **No gradients** - Clean, solid colors only
- ✅ **Mobile-first** - Optimized for trainers working on phones in the gym
- ✅ **User intuitive** - Flexible workout builder with freedom to customize
- ✅ **High quality** - Better than reference projects (wellness-frontend, class-dash-demo)

## 📋 Complete Requirements

👉 **See [TRAINER_AIDE_DEMO_REQUIREMENTS.md](./TRAINER_AIDE_DEMO_REQUIREMENTS.md)** for the complete development guide.

This comprehensive document includes:
- Tech stack and project setup
- Design system (brand colors, typography, components)
- Complete data models and mock data
- Feature specifications for all user roles
- Component architecture with code examples
- Mobile design patterns
- 7-day implementation workflow
- Quality checklist

## 🎨 Brand Colors

```
Primary Magenta: #a71075
Cyan: #45f2ff
Blue: #00bafc
Dark Blue: #0085c4
```

## 🚀 Key Features

### Studio Owner
- Create workout templates (3-block standard OR resistance-only)
- Assign templates to studios
- Manage exercise library
- View all session history

### Trainer
- View assigned templates (read-only)
- Start sessions with three sign-off modes:
  - **Full Session**: Complete all at once
  - **Per Block**: Sign off after each block
  - **Per Exercise**: Check off each exercise individually
- 30-minute timer with auto-complete
- RPE (Rate of Perceived Exertion) tracking
- Session notes and client progress

### Client
- View upcoming sessions
- Browse complete session history
- See workout details and trainer notes

## 📱 Mobile Optimization

- Touch-friendly interface (44x44px minimum tap targets)
- Swipe gestures for navigation
- Bottom navigation
- Optimized forms
- Separate mobile UX patterns

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **State**: Zustand + React Context
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Storage**: LocalStorage (demo only)

## 📂 Project Structure

```
trainer-aide-demo/
├── app/                    # Next.js app router pages
│   ├── studio-owner/      # Studio owner features
│   ├── trainer/           # Trainer features
│   └── client/            # Client features
├── components/            # React components
│   ├── layout/           # Sidebar, navigation
│   ├── studio-owner/     # Template builder, etc.
│   ├── trainer/          # Session runner, etc.
│   ├── shared/           # Reusable components
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── mock-data/        # Mock exercises, templates, sessions
│   ├── stores/           # Zustand stores
│   ├── types/            # TypeScript types
│   └── utils/            # Helper functions
└── styles/               # Global CSS
```

## 🎯 Success Criteria

This demo is successful when:

1. ✅ **Visually Stunning**: Clean, modern design that impresses immediately
2. ✅ **Fully Functional**: All features work without bugs
3. ✅ **Mobile Excellence**: Perfect mobile experience, not just responsive
4. ✅ **Better Than References**: Clearly superior to wellness-frontend and class-dash-demo
5. ✅ **Client Delight**: Client sees their vision come to life

## 📖 Getting Started

**For the AI agent building this:**

1. Read `TRAINER_AIDE_DEMO_REQUIREMENTS.md` thoroughly
2. Follow the 7-day implementation workflow
3. Use the provided mock data and component examples
4. Maintain the design system consistently
5. Test on mobile devices throughout development

## 🎬 Demo Flow

1. **Studio Owner**: Create a workout template
2. **Trainer**: View template, start session with client
3. **Trainer**: Run through workout with one of three sign-off modes
4. **Trainer**: Complete session with RPE and notes
5. **Client**: View completed session in history

## 📝 Notes

- This is a **demo only** - no backend integration
- Data persists in LocalStorage for demo continuity
- All user interactions are fully functional
- Mock data creates realistic testing scenarios

---

**Ready to build something amazing! 💪**

For complete specifications, see: [TRAINER_AIDE_DEMO_REQUIREMENTS.md](./TRAINER_AIDE_DEMO_REQUIREMENTS.md)
