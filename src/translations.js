import { ja } from "./japanese.js";
import { communityTranslations } from "./communityTranslations.js";
import { episodeTranslations } from "./episodeTranslations.js";
import { dmMy } from "./dmTranslations.js";
export const languages = { en: "English", my: "မြန်မာ", ja: "日本語" };
export const my = {
  "Mood": "ခံစားချက်",
  "Calm": "စိတ်အေးချမ်း",
  "Happy": "ပျော်ရွှင်",
  "Sad": "ဝမ်းနည်း",
  "Anxious": "စိုးရိမ်",
  "Hopeful": "မျှော်လင့်ချက်ရှိ",
  "Overwhelmed": "စိတ်ပင်ပန်းလွန်း",
  "How are you feeling?": "အခု ဘယ်လိုခံစားနေရလဲ။",
  "Choose a mood (optional)": "ခံစားချက် ရွေးနိုင်ပါတယ် (မရွေးလည်းရ)",
  "Only you can see this mood.": "ဒီခံစားချက်ကို သင်တစ်ယောက်ပဲ မြင်နိုင်ပါတယ်။",
  "Find a journal entry": "မှတ်စု ရှာရန်",
  "Search your journal": "ကိုယ်ပိုင်မှတ်စုများ ရှာရန်",
  "Search titles and words…": "ခေါင်းစဉ်နဲ့ စာသားထဲမှာ ရှာပါ…",
  "Date (UTC)": "ရက်စွဲ (UTC)",
  "All moods": "ခံစားချက် အားလုံး",
  "All categories": "အမျိုးအစား အားလုံး",
  "Clear filters": "စစ်ထုတ်မှုများ ရှင်းရန်",
  "Download entire journal": "မှတ်စုအားလုံး ဒေါင်းလုဒ်ယူရန်",
  "Preparing download…": "ဒေါင်းလုဒ်အတွက် ပြင်ဆင်နေသည်…",
  "Downloads include private entries and drafts. Keep the file somewhere private.": "ဒေါင်းလုဒ်ဖိုင်မှာ ကိုယ်ပိုင်မှတ်စုနဲ့ မူကြမ်းတွေ ပါပါတယ်။ လုံခြုံတဲ့နေရာမှာ သိမ်းပါ။",
  "No entries match these filters": "ဒီစစ်ထုတ်မှုနဲ့ ကိုက်ညီတဲ့မှတ်စု မရှိပါ",
  "Try another word, date or mood, or clear the filters.": "တခြားစာလုံး၊ ရက်စွဲ၊ ခံစားချက်နဲ့ ရှာပါ။ ဒါမှမဟုတ် စစ်ထုတ်မှုတွေ ရှင်းပါ။",
  "Your journal is empty.": "သင့်မှတ်စုထဲမှာ စာမရှိသေးပါ။",
  "Your journal download is ready.": "သင့်မှတ်စု ဒေါင်းလုဒ် ပြင်ဆင်ပြီးပါပြီ။",
  "Journal download could not finish. Please try again.": "ဒေါင်းလုဒ် မပြီးမြောက်ပါ။ ပြန်စမ်းပါ။",
  "My journal": "ကျွန်ုပ်၏ ကိုယ်ပိုင်မှတ်စု",
  "Untitled entry": "ခေါင်းစဉ်မရှိသော မှတ်စု",
  "What felt a little easier today?": "ဒီနေ့ ဘယ်အရာက နည်းနည်း ပိုလွယ်ကူသွားလဲ။",
  "What would you say to yourself with kindness?": "ကိုယ့်ကိုယ်ကို ကြင်နာစွာ ဘာပြောချင်လဲ။",
  "Choose a valid mood.": "မှန်ကန်သော ခံစားချက်ကို ရွေးပါ။",
  "Choose a valid date.": "မှန်ကန်သော ရက်စွဲကို ရွေးပါ။",
  "Keep searches within 200 characters.": "ရှာဖွေစာသားကို စာလုံး ၂၀၀ အတွင်း ထည့်ပါ။",
  "Confirm password": "စကားဝှက်ကို ထပ်မံထည့်ပါ",
  "Passwords do not match.": "စကားဝှက်နှစ်ခု မတူပါ။",
  "Show password": "စကားဝှက်ကို ပြရန်",
  "Hide password": "စကားဝှက်ကို ဖျောက်ရန်",
  "Show confirmation password": "အတည်ပြုစကားဝှက်ကို ပြရန်",
  "Hide confirmation password": "အတည်ပြုစကားဝှက်ကို ဖျောက်ရန်",
  ...dmMy,
  "Safety reminder": "လုံခြုံရေး သတိပေးချက်",
  "Be cautious with requests for money, investments, or moving to another app. A shared feeling does not verify someone's identity. Use Report or Block if you feel pressured.":
    "ငွေတောင်းခြင်း၊ ရင်းနှီးမြှုပ်နှံဖိတ်ခေါ်ခြင်း၊ အခြား app သို့ခေါ်ခြင်းတို့ကို သတိထားပါ။ ခံစားချက်တူသည်ဆိုခြင်းက မည်သူဖြစ်ကြောင်း အတည်မပြုနိုင်ပါ။ ဖိအားပေးခံရပါက တိုင်ကြားရန် သို့မဟုတ် ပိတ်ရန်ကို သုံးပါ။",
  "This is an automatic reminder, not a finding of fraud.":
    "ဤသည် အလိုအလျောက်သတိပေးချက်ဖြစ်ပြီး လိမ်လည်မှုဟု ဆုံးဖြတ်ထားခြင်းမဟုတ်ပါ။",
  "Request review": "ပြန်လည်စစ်ဆေးရန် တောင်းဆိုမည်",
  "Your review request has been sent.":
    "ပြန်လည်စစ်ဆေးရန် တောင်းဆိုချက် ပို့ပြီးပါပြီ။",
  "Report a suspected scam": "လိမ်လည်မှုဟု သံသယရှိကြောင်း တိုင်ကြားမည်",
  "Suspected scam or financial solicitation":
    "လိမ်လည်မှု သို့မဟုတ် ငွေကြေးဆိုင်ရာ ဖိတ်ခေါ်မှုဟု သံသယရှိသည်",
  "Please wait before sending the same message again.":
    "တူညီသောစာကို ထပ်မပို့မီ ခဏစောင့်ပါ။",
  "Hidden content not found.": "ဖျောက်ထားသောစာကို မတွေ့ပါ။",
  "Unsaid is a gentle space for regrets, unspoken feelings, and personal reflections. Share anonymously, listen with care, or keep your words in a journal that belongs only to you. There are no rankings or streaks here. Take your time.":
    "Unsaid က နောင်တများ၊ မပြောဖြစ်ခဲ့သောခံစားချက်များနဲ့ ကိုယ်ပိုင်အတွေးများကို ရေးချနိုင်တဲ့ နွေးထွေးသောနေရာပါ။ အမည်မဖော်ဘဲ မျှဝေနိုင်သလို ကိုယ်ပိုင်မှတ်စုထဲမှာလည်း သိမ်းထားနိုင်ပါတယ်။ လူကြိုက်များမှုအဆင့်နဲ့ နေ့စဉ်သုံးရမယ့်ဖိအား မရှိပါဘူး။ သင့်အချိန်ကို ယူပါ။",
  "Treat every thought with care. Respect the author’s response preference. Listen without judgment; offer advice only when it is welcome. Do not share identifying information about yourself or others. Harassment, threats, spam, and hateful content are not welcome. Use the report menu when something needs attention, and block authors you would prefer not to read.":
    "စာတိုင်းကို လေးစားစွာ ဆက်ဆံပါ။ စာရေးသူလိုချင်တဲ့ တုံ့ပြန်မှုကို လေးစားပါ။ မဝေဖန်ဘဲ နားထောင်ပြီး အကြံတောင်းမှသာ အကြံပေးပါ။ သင်နဲ့ အခြားသူများကို ဖော်ထုတ်နိုင်တဲ့ အချက်အလက်များ မမျှဝေပါနဲ့။ နှောင့်ယှက်မှု၊ ခြိမ်းခြောက်မှု၊ ကြော်ငြာနှောင့်ယှက်စာနဲ့ အမုန်းစကားတွေကို ခွင့်မပြုပါဘူး။ လိုအပ်ရင် တိုင်ကြားပြီး မဖတ်ချင်သော စာရေးသူများကို ပိတ်ထားနိုင်ပါတယ်။",
  "Public posts and replies are displayed anonymously. Your account email is never shown to readers. Private entries and drafts can only be read through your signed-in account and are excluded from the moderation dashboard. This installation stores accounts and content in its MySQL database and uses a session cookie for authentication. Private journals are access-controlled, but are not end-to-end encrypted. You can delete your posts and replies at any time.":
    "အများမြင်စာနဲ့ မှတ်ချက်များကို အမည်မဖော်ဘဲ ပြသပါတယ်။ သင့်အီးမေးလ်ကို ဖတ်သူတွေ မမြင်ရပါဘူး။ ကိုယ်ပိုင်မှတ်စုနဲ့ မူကြမ်းတွေကို သင့်အကောင့်ကသာ ဖတ်နိုင်ပြီး စီမံသူစာမျက်နှာမှာ မပါဝင်ပါဘူး။ အကောင့်နဲ့စာတွေကို MySQL database မှာ သိမ်းပြီး ဝင်ရောက်မှုအတွက် session cookie သုံးပါတယ်။ ကိုယ်ပိုင်မှတ်စုတွေကို ဝင်ရောက်ခွင့်ဖြင့် ကာကွယ်ထားပေမဲ့ end-to-end encryption မသုံးထားပါဘူး။ သင့်စာနဲ့မှတ်ချက်တွေကို အချိန်မရွေး ဖျက်နိုင်ပါတယ်။",
  "For a concern about a public thought or reply, use its report menu. Reports go directly to this site’s administrators. For account or privacy questions, contact the operator of this installation. Their contact address should be published here before a public launch.":
    "အများမြင်စာ သို့မဟုတ် မှတ်ချက်အတွက် စိုးရိမ်စရာရှိရင် တိုင်ကြားမီနူးကို သုံးပါ။ တိုင်ကြားချက်တွေကို ဆိုက်စီမံသူက လက်ခံပါတယ်။ အကောင့်နဲ့ ကိုယ်ရေးလုံခြုံမှုအတွက် ဆိုက်စီမံသူထံ ဆက်သွယ်ပါ။ အများပြည်သူသုံးနိုင်ရန် မဖွင့်မီ ဆက်သွယ်ရန်လိပ်စာကို ဒီနေရာမှာ ဖော်ပြပေးရပါမယ်။",
  "Selected public text is sent to Google only when you request a translation. Private journals and drafts are never sent for translation.":
    "ဘာသာပြန်ရန် တောင်းဆိုမှသာ ရွေးထားသော အများမြင်စာကို Google သို့ ပို့ပါတယ်။ ကိုယ်ပိုင်မှတ်စုနဲ့ မူကြမ်းတွေကို ဘာသာပြန်ရန် မပို့ပါဘူး။",
  "Report #": "တိုင်ကြားချက် #",
  open: "ဖွင့်ထားသည်",
  resolved: "ဖြေရှင်းပြီး",
  "Invalid language.": "မှန်ကန်သော ဘာသာစကားရွေးပါ။",
  "Thought not found.": "စာကို မတွေ့ပါဘူး။",
  "Reply not found.": "မှတ်ချက်ကို မတွေ့ပါဘူး။",
  "Password must be between 10 and 128 characters without null bytes.":
    "စကားဝှက်မှာ စာလုံး ၁၀ မှ ၁၂၈ လုံး ရှိရပြီး null အက္ခရာ မပါရပါဘူး။",
  "Choose a category.": "အမျိုးအစားရွေးပါ။",
  "Choose valid publishing options.":
    "မှန်ကန်သော တင်ပြမှုရွေးချယ်ချက်များ သုံးပါ။",
  "Only the author can edit this thought.": "စာရေးသူသာ ဤစာကို ပြင်နိုင်ပါတယ်။",
  "Only the author can delete this thought.":
    "စာရေးသူသာ ဤစာကို ဖျက်နိုင်ပါတယ်။",
  "Only the author can delete this reply.":
    "စာရေးသူသာ ဤမှတ်ချက်ကို ဖျက်နိုင်ပါတယ်။",
  "You cannot block yourself.": "သင့်ကိုယ်သင် ပိတ်၍ မရပါဘူး။",
  "Invalid preferences.": "ရွေးချယ်ချက်များ မမှန်ပါဘူး။",
  "Invalid category.": "အမျိုးအစား မမှန်ပါဘူး။",
  "Database is not configured. Follow README.md to connect MySQL.":
    "Database ကို မချိတ်ဆက်ရသေးပါဘူး။ MySQL ချိတ်ဆက်ရန် README.md ကို ကြည့်ပါ။",
  "Administrator access required.": "စီမံသူခွင့်ပြုချက် လိုအပ်ပါတယ်။",
  "Request is too large.": "ပို့ထားသောအချက်အလက် အရွယ်အစား ကြီးလွန်းပါတယ်။",
  "Invalid JSON.": "ပို့ထားသောအချက်အလက်ပုံစံ မမှန်ပါဘူး။",
  "Invalid feed.": "စာရင်းအမျိုးအစား မမှန်ပါဘူး။",
  "Invalid reaction.": "တုံ့ပြန်မှု မမှန်ပါဘူး။",
  "Blocked account not found.": "ပိတ်ထားသောအကောင့်ကို မတွေ့ပါဘူး။",
  "Report not found.": "တိုင်ကြားချက်ကို မတွေ့ပါဘူး။",
  "Invalid action.": "လုပ်ဆောင်ချက် မမှန်ပါဘူး။",
  "Endpoint not found.": "ဝန်ဆောင်မှုကို မတွေ့ပါဘူး။",
  Explore: "လေ့လာရန်",
  "My Journal": "ကိုယ်ပိုင်မှတ်စု",
  Saved: "သိမ်းထားသောစာများ",
  "Write a thought": "ခံစားချက်ရေးရန်",
  "Share a thought": "ခံစားချက်မျှဝေရန်",
  "Some things are": "တချို့အကြောင်းအရာတွေက",
  "easier to write.": "ရေးချလိုက်ရင် ပိုလွယ်တယ်။",
  "A gentle place for the things you never said.":
    "မပြောဖြစ်ခဲ့တဲ့ စကားတွေအတွက် နွေးထွေးတဲ့နေရာ။",
  "Keep it private": "ကိုယ်ပိုင်သိမ်းထားရန်",
  "All thoughts": "ခံစားချက်အားလုံး",
  Family: "မိသားစု",
  Relationships: "အချစ်ရေး",
  Friendship: "မိတ်ဆွေများ",
  Career: "အလုပ်အကိုင်",
  "Moving forward": "ရှေ့ဆက်ခြင်း",
  "A little understanding goes a long way":
    "နားလည်ပေးမှုလေးက အများကြီးအဓိပ္ပာယ်ရှိတယ်",
  Latest: "နောက်ဆုံးတင်ထားသော",
  Oldest: "အရင်ဆုံးတင်ထားသော",
  Anonymous: "အမည်မဖော်သူ",
  "Just listening": "နားထောင်ပေးရုံပါပဲ",
  "Advice welcome": "အကြံပေးနိုင်ပါတယ်",
  "Comments off": "မှတ်ချက်ပိတ်ထားသည်",
  "I understand": "နားလည်ပေးပါတယ်",
  "Me too": "ကျွန်ုပ်လည်း အတူတူပါပဲ",
  Reply: "တုံ့ပြန်ရန်",
  Read: "ဖတ်ရန်",
  "Your own quiet corner": "သင့်အတွက် အေးချမ်းတဲ့နေရာ",
  "Not everything needs to be shared.": "အရာအားလုံးကို မျှဝေဖို့ မလိုပါဘူး။",
  "Open my journal": "ကိုယ်ပိုင်မှတ်စုဖွင့်ရန်",
  "Choose what you read": "ဖတ်ချင်တာကို ရွေးချယ်ပါ",
  "Make this space feel like yours.": "ဒီနေရာကို သင့်စိတ်ကြိုက် ပြင်ဆင်ပါ။",
  "Manage preferences": "ရွေးချယ်မှုများ ပြင်ဆင်ရန်",
  "Take your time. You can come back whenever you like.":
    "အလျင်မလိုပါဘူး။ စိတ်အဆင်ပြေတဲ့အချိန် ပြန်လာနိုင်ပါတယ်။",
  About: "ကျွန်ုပ်တို့အကြောင်း",
  "Community Guidelines": "အဖွဲ့ဝင်လမ်းညွှန်ချက်များ",
  Privacy: "ကိုယ်ရေးလုံခြုံမှု",
  Contact: "ဆက်သွယ်ရန်",
  "My Posts": "ကျွန်ုပ်၏စာများ",
  Settings: "ဆက်တင်များ",
  Moderation: "အကြောင်းအရာစီမံခြင်း",
  "Sign out": "အကောင့်မှထွက်ရန်",
  "Sign in / Register": "ဝင်ရောက်ရန် / အကောင့်ဖွင့်ရန်",
  "Sign in": "ဝင်ရောက်ရန်",
  "Create account": "အကောင့်ဖွင့်ရန်",
  "A space of your own": "သင့်ကိုယ်ပိုင်နေရာ",
  "Welcome back": "ပြန်လည်ကြိုဆိုပါတယ်",
  "Your account stays private. Your public thoughts are always anonymous.":
    "သင့်အကောင့်အချက်အလက်က သီးသန့်ဖြစ်ပါတယ်။ မျှဝေထားတဲ့စာတွေမှာ အမည်မဖော်ပြပါဘူး။",
  "Email address": "အီးမေးလ်လိပ်စာ",
  Password: "စကားဝှက်",
  "Use at least 10 characters.": "အနည်းဆုံး စာလုံး ၁၀ လုံး သုံးပါ။",
  "Already have an account? Sign in": "အကောင့်ရှိပြီးသားလား။ ဝင်ရောက်ပါ",
  "New to Unsaid? Create an account": "Unsaid ကို စသုံးတာလား။ အကောင့်ဖွင့်ပါ",
  "Revisit your thought": "သင့်စာကို ပြန်ပြင်ရန်",
  "What’s on your mind?": "စိတ်ထဲမှာ ဘာတွေရှိနေလဲ။",
  "There’s no perfect way to say it. Start wherever you are.":
    "အကောင်းဆုံးဖြစ်ဖို့ မလိုပါဘူး။ စိတ်ထဲရှိတာကနေ စရေးပါ။",
  "Your thought": "သင့်ခံစားချက်",
  "The things I never said…": "မပြောဖြစ်ခဲ့တဲ့ စကားတွေ…",
  Category: "အမျိုးအစား",
  "Where it belongs": "သိမ်းဆည်းမည့်နေရာ",
  "Public · anonymous": "အများမြင် · အမည်မဖော်",
  "Private journal · only you": "ကိုယ်ပိုင်မှတ်စု · သင်သာမြင်ရမည်",
  "Private · only you": "သီးသန့် · သင်သာမြင်ရမည်",
  "What would feel helpful?": "ဘယ်လိုတုံ့ပြန်မှုကို လိုချင်ပါသလဲ။",
  "Save draft": "မူကြမ်းသိမ်းရန်",
  Preview: "အကြိုကြည့်ရန်",
  "Back to writing": "စာပြန်ရေးရန်",
  "Save privately": "သီးသန့်သိမ်းရန်",
  "Save changes": "ပြင်ဆင်မှုသိမ်းရန်",
  "Share thought": "ခံစားချက်မျှဝေရန်",
  "Preview your thought before publishing. You can edit or delete it anytime.":
    "မတင်ခင် သင့်စာကို အကြိုကြည့်ပါ။ အချိန်မရွေး ပြင်ဆင်နိုင်၊ ဖျက်နိုင်ပါတယ်။",
  "Private journal": "ကိုယ်ပိုင်မှတ်စု",
  Draft: "မူကြမ်း",
  "Hidden by moderation": "စီမံသူက ဖျောက်ထားသည်",
  "Only you can read this": "သင်သာ ဖတ်နိုင်သည်",
  Edit: "ပြင်ရန်",
  "Unsave thought": "သိမ်းထားမှုဖယ်ရန်",
  "Save thought": "စာသိမ်းရန်",
  "Edit thought": "စာပြင်ရန်",
  "Delete thought": "စာဖျက်ရန်",
  "Report thought": "စာတိုင်ကြားရန်",
  "Block this author": "ဤစာရေးသူကို ပိတ်ရန်",
  Report: "တိုင်ကြားရန်",
  "Block author": "စာရေးသူကို ပိတ်ရန်",
  "Your own quiet corner": "သင့်အတွက် အေးချမ်းတဲ့နေရာ",
  "The thoughts you’ve shared": "သင်မျှဝေထားတဲ့စာများ",
  "Words to come back to": "ပြန်ဖတ်ချင်တဲ့စာများ",
  "Your private reflections and unfinished thoughts. Only you can read them.":
    "သင့်ကိုယ်ပိုင်ခံစားချက်များနဲ့ မပြီးသေးတဲ့စာများ။ သင်သာ ဖတ်နိုင်ပါတယ်။",
  "Every public thought, shared anonymously. Revisit them whenever you need.":
    "အမည်မဖော်ဘဲ မျှဝေထားတဲ့စာများ။ လိုအပ်တဲ့အချိန် ပြန်ဖတ်နိုင်ပါတယ်။",
  "A small collection of thoughts that made you feel understood.":
    "သင့်ကို နားလည်ပေးသလို ခံစားရစေတဲ့စာလေးများ။",
  "Making a little room…": "ခဏလေး စောင့်ပါ…",
  "A space that belongs to you": "သင့်အတွက် ကိုယ်ပိုင်နေရာ",
  "Sign in to open your": "ဝင်ရောက်ပြီး ဖွင့်ကြည့်ပါ —",
  "saved thoughts": "သိမ်းထားသောစာများ",
  "private journal": "ကိုယ်ပိုင်မှတ်စု",
  "own thoughts": "သင့်စာများ",
  "A quiet moment": "အေးချမ်းတဲ့အခိုက်အတန့်",
  "Start with a few words": "စကားလုံးအနည်းငယ်နဲ့ စတင်ပါ",
  "Nothing here just yet": "လောလောဆယ် စာမရှိသေးပါဘူး",
  "No thoughts match your reading preferences yet.":
    "သင့်ရွေးချယ်မှုနဲ့ ကိုက်ညီတဲ့စာ မရှိသေးပါဘူး။",
  "Save a thought from its options menu to find it here.":
    "စာရဲ့ရွေးချယ်စရာမီနူးကနေ သိမ်းလိုက်ရင် ဒီမှာပြန်တွေ့နိုင်ပါတယ်။",
  "There’s no perfect beginning. Write what feels right.":
    "အစကတည်းက ပြည့်စုံဖို့ မလိုပါဘူး။ စိတ်ထဲရှိတာ ရေးချပါ။",
  "Explore thoughts": "စာများဖတ်ရန်",
  "Try again": "ပြန်ကြိုးစားရန်",
  "Load more thoughts": "နောက်ထပ်စာများကြည့်ရန်",
  "Back to thoughts": "စာများသို့ ပြန်သွားရန်",
  "Opening this thought…": "စာကို ဖွင့်နေသည်…",
  "A little conversation": "စကားဝိုင်းလေး",
  "This author just wants to be heard. Replies are closed; you can show understanding with a reaction.":
    "စာရေးသူက နားထောင်ပေးစေချင်ရုံပါပဲ။ မှတ်ချက်ပိတ်ထားပါတယ်။ နားလည်ပေးမှုကို reaction နဲ့ ပြနိုင်ပါတယ်။",
  "The author has chosen to keep replies closed.":
    "စာရေးသူက မှတ်ချက်တွေကို ပိတ်ထားပါတယ်။",
  "Kind words and thoughtful advice are welcome.":
    "ကြင်နာတဲ့စကားတွေနဲ့ အကြံပြုချက်တွေ ရေးပေးနိုင်ပါတယ်။",
  "A little understanding can start with you.":
    "နားလည်ပေးမှုလေးကို သင်က စတင်ပေးနိုင်ပါတယ်။",
  "Replies are closed for this thought.": "ဤစာအတွက် မှတ်ချက်ပိတ်ထားပါတယ်။",
  "Delete reply": "မှတ်ချက်ဖျက်ရန်",
  "Leave a gentle reply": "ကြင်နာတဲ့မှတ်ချက်ရေးပါ",
  "I hear you…": "သင့်ကို နားထောင်ပေးနေပါတယ်…",
  "Send reply": "မှတ်ချက်ပို့ရန်",
  "Sign in to reply": "မှတ်ချက်ရေးရန် ဝင်ရောက်ပါ",
  "Make yourself at home.": "သင့်စိတ်ကြိုက် ပြင်ဆင်ပါ။",
  "A few small choices to make this space feel like yours.":
    "သင့်အတွက် ပိုအဆင်ပြေစေမယ့် ရွေးချယ်မှုလေးများ။",
  "Sign in to manage your preferences and blocked accounts.":
    "ရွေးချယ်မှုများနဲ့ ပိတ်ထားသောအကောင့်များကို ပြင်ဆင်ဖို့ ဝင်ရောက်ပါ။",
  "Your reading preferences": "သင့်ဖတ်ရှုမှုရွေးချယ်ချက်များ",
  "Only selected categories appear in your Explore feed.":
    "ရွေးထားတဲ့အမျိုးအစားများသာ သင့် feed မှာ ပေါ်ပါမယ်။",
  "Blocked accounts": "ပိတ်ထားသောအကောင့်များ",
  "Their identities stay private. Unblock an account to see its public content again.":
    "၎င်းတို့ရဲ့အမည်ကို မဖော်ပြပါဘူး။ ပိတ်ထားမှုဖယ်လိုက်ရင် မျှဝေထားတဲ့စာတွေ ပြန်မြင်နိုင်ပါတယ်။",
  "Anonymous account": "အမည်မဖော်သောအကောင့်",
  Unblock: "ပိတ်ထားမှုဖယ်ရန်",
  "No blocked accounts.": "ပိတ်ထားသောအကောင့် မရှိပါဘူး။",
  "Community care": "အဖွဲ့ဝင်များကို စောင့်ရှောက်ခြင်း",
  "Review reported public content. Private journals and drafts are excluded.":
    "တိုင်ကြားထားသော အများမြင်စာများကို စစ်ဆေးပါ။ ကိုယ်ပိုင်မှတ်စုနဲ့ မူကြမ်းတွေ မပါဝင်ပါဘူး။",
  "Loading reports…": "တိုင်ကြားချက်များ ရယူနေသည်…",
  "No reports to review": "စစ်ဆေးရန် တိုင်ကြားချက်မရှိပါဘူး",
  "Reason:": "အကြောင်းပြချက်:",
  "Content is": "စာအခြေအနေ:",
  hidden: "ဖျောက်ထားသည်",
  visible: "မြင်နိုင်သည်",
  Thought: "စာ",
  "Hide content": "စာဖျောက်ရန်",
  "Restore content": "စာပြန်ဖော်ရန်",
  "Dismiss report": "တိုင်ကြားချက်ပယ်ရန်",
  "Back to Explore": "လေ့လာရန်သို့ ပြန်သွားရန်",
  "This corner doesn’t exist yet.": "ဤစာမျက်နှာ မရှိသေးပါဘူး။",
  "Let us know what happened": "ဖြစ်ပျက်ခဲ့တာကို ပြောပြပါ",
  "Create a little distance?": "ဤစာရေးသူကို ပိတ်မလား။",
  "Delete this thought?": "ဤစာကို ဖျက်မလား။",
  "Your report is private and will be reviewed by an administrator.":
    "သင့်တိုင်ကြားချက်က သီးသန့်ဖြစ်ပြီး စီမံသူက စစ်ဆေးပါမယ်။",
  Reason: "အကြောင်းပြချက်",
  "Tell us what concerns you…": "စိုးရိမ်နေတဲ့အကြောင်း ပြောပြပါ…",
  "This author’s public posts and replies will be hidden from you. You can unblock them in Settings.":
    "ဤစာရေးသူရဲ့ အများမြင်စာနဲ့မှတ်ချက်တွေကို သင်မမြင်ရတော့ပါဘူး။ ဆက်တင်မှာ ပိတ်ထားမှုဖယ်နိုင်ပါတယ်။",
  "This will permanently remove your thought and its replies. This action cannot be undone.":
    "ဤစာနဲ့မှတ်ချက်များကို အပြီးဖျက်ပါမယ်။ ပြန်ယူ၍ မရနိုင်ပါဘူး။",
  Cancel: "မလုပ်တော့ပါ",
  "Please wait…": "ခဏစောင့်ပါ…",
  "Send report": "တိုင်ကြားချက်ပို့ရန်",
  "Close dialog": "ပိတ်ရန်",
  "Main navigation": "အဓိကလမ်းညွှန်",
  "Account menu": "အကောင့်မီနူး",
  "Close account menu": "အကောင့်မီနူးပိတ်ရန်",
  "Thought options": "စာရွေးချယ်စရာများ",
  "Close options": "ရွေးချယ်စရာများပိတ်ရန်",
  "Filter thoughts": "စာစစ်ထုတ်ရန်",
  "Sort thoughts": "စာအစီအစဉ်",
  Language: "ဘာသာစကား",
  "App language": "အက်ပ်ဘာသာစကား",
  "Choose the language for menus and translations.":
    "မီနူးများနဲ့ ဘာသာပြန်စာများအတွက် ဘာသာစကားရွေးပါ။",
  Translate: "ဘာသာပြန်ရန်",
  "See original": "မူရင်းကြည့်ရန်",
  "See translation": "ဘာသာပြန်ကြည့်ရန်",
  "Translating…": "ဘာသာပြန်နေသည်…",
  "Translated by Google. Translations may not be exact.":
    "Google ဖြင့် ဘာသာပြန်ထားသည်။ အဓိပ္ပာယ်အတိအကျ မတူနိုင်ပါ။",
  "Translate this public text with Google?":
    "ဤအများမြင်စာကို Google ဖြင့် ဘာသာပြန်မလား။",
  "Only this selected text will be sent to Google Cloud Translation.":
    "ရွေးထားသော ဤစာသားကိုသာ Google Cloud Translation သို့ ပို့ပါမယ်။",
  "Translation is not configured yet. Ask the site operator to set up Google Cloud Translation.":
    "ဘာသာပြန်စနစ်ကို မချိတ်ဆက်ရသေးပါဘူး။ Google Cloud Translation ကို ချိတ်ဆက်ရန် ဆိုက်စီမံသူထံ ဆက်သွယ်ပါ။",
  "Translation is temporarily unavailable. Please try again later.":
    "လောလောဆယ် ဘာသာပြန်မရပါဘူး။ နောက်မှ ပြန်ကြိုးစားပါ။",
  "Please sign in to continue.": "ဆက်လုပ်ရန် အကောင့်ဝင်ပါ။",
  "Please try again.": "ပြန်ကြိုးစားပါ။",
  "Your session changed. Refresh and try again.":
    "သင့် session ပြောင်းသွားပါတယ်။ စာမျက်နှာပြန်ဖွင့်ပြီး ကြိုးစားပါ။",
  "The service is temporarily unavailable. Please try again later.":
    "လောလောဆယ် ဝန်ဆောင်မှုမရနိုင်ပါဘူး။ နောက်မှ ပြန်ကြိုးစားပါ။",
  "Email or password is incorrect.": "အီးမေးလ် သို့မဟုတ် စကားဝှက် မမှန်ပါဘူး။",
  "Enter a valid email address.": "မှန်ကန်သော အီးမေးလ်လိပ်စာ ထည့်ပါ။",
  "Please take a moment before trying again.": "ခဏစောင့်ပြီး ပြန်ကြိုးစားပါ။",
  "Something went wrong. Please try again.":
    "အမှားဖြစ်သွားပါတယ်။ ပြန်ကြိုးစားပါ။",
  "Unable to register with this email. Try signing in.":
    "ဤအီးမေးလ်နဲ့ အကောင့်ဖွင့်မရပါဘူး။ အကောင့်ဝင်ကြည့်ပါ။",
  "Your browser is not keeping this site's session cookie. Allow cookies for this site and try again.":
    "Browser က ဒီဆိုက်ရဲ့ session cookie ကို မသိမ်းထားပါဘူး။ ဒီဆိုက်အတွက် cookie ခွင့်ပြုပြီး ပြန်ကြိုးစားပါ။",
  "The server could not be reached. Check your PHP server.":
    "Server ကို ဆက်သွယ်မရပါဘူး။ PHP server ကို စစ်ဆေးပါ။",
  "Your reading preferences are saved.":
    "သင့်ရွေးချယ်မှုများကို သိမ်းထားပါပြီ။",
  "Your thought has been deleted.": "သင့်စာကို ဖျက်ပြီးပါပြီ။",
  "Your reply has been deleted.": "သင့်မှတ်ချက်ကို ဖျက်ပြီးပါပြီ။",
  "Your draft is safely saved.": "မူကြမ်းကို သိမ်းထားပါပြီ။",
  "Saved to your private journal.": "ကိုယ်ပိုင်မှတ်စုထဲ သိမ်းထားပါပြီ။",
  "Your thought has been shared.": "သင့်စာကို မျှဝေပြီးပါပြီ။",
  "Saved for another quiet moment.": "နောက်တစ်ခါ ပြန်ဖတ်ဖို့ သိမ်းထားပါပြီ။",
  "Removed from your saved thoughts.": "သိမ်းထားသောစာများမှ ဖယ်ပြီးပါပြီ။",
  "Thank you. Your report has been sent for review.":
    "ကျေးဇူးတင်ပါတယ်။ တိုင်ကြားချက်ကို စစ်ဆေးဖို့ ပို့ပြီးပါပြီ။",
  "This author is blocked. Their thoughts and replies are hidden.":
    "စာရေးသူကို ပိတ်ပြီးပါပြီ။ ၎င်းရဲ့စာနဲ့မှတ်ချက်များကို ဖျောက်ထားပါပြီ။",
  "Account unblocked.": "အကောင့်ပိတ်ထားမှု ဖယ်ပြီးပါပြီ။",
  "Moderation action recorded.": "စီမံမှုကို မှတ်တမ်းတင်ပြီးပါပြီ။",
  "You have signed out.": "အကောင့်မှ ထွက်ပြီးပါပြီ။",
  "Just now": "ယခုလေးတင်",
  "1 hour ago": "၁ နာရီအကြာက",
  Yesterday: "မနေ့က",
  "A little room for the unsaid": "မပြောဖြစ်ခဲ့တဲ့စကားများအတွက် နေရာလေး",
  "Your privacy matters": "သင့်ကိုယ်ရေးလုံခြုံမှုက အရေးပါပါတယ်",
  "Get in touch": "ဆက်သွယ်ပါ",
};

const socialUI = {
  "Home": ["ပင်မ", "ホーム"],
  "Skip to content": ["အကြောင်းအရာသို့ သွားရန်", "本文へスキップ"],
  "Share anonymously": ["အမည်မဖော်ဘဲ မျှဝေပါ", "匿名でシェア"],
  "A space to be yourself": ["ကိုယ့်စိတ်တိုင်းကျ ရင်ဖွင့်ရာ", "自分らしくいられる場所"],
  "Your feed, your choice": ["ကိုယ်ဖတ်ချင်တာ ကိုယ်ရွေးပါ", "読みたいものを、自分で"],
  "Your space": ["သင့်အတွက်နေရာ", "あなたのスペース"],
  "Your account": ["သင့်အကောင့်", "アカウント"],
  "Save for later": ["နောက်မှဖတ်ရန် သိမ်းမယ်", "あとで読むために保存"],
  "Remove from saved": ["သိမ်းထားရာမှ ဖယ်မယ်", "保存を解除"],
};

export function translateUI(text, language) {
  if (socialUI[text] && (language === "my" || language === "ja")) return socialUI[text][language === "my" ? 0 : 1];
  if (communityTranslations[text] && (language === "my" || language === "ja"))
    return communityTranslations[text][language === "my" ? 0 : 1];
  if (episodeTranslations[text] && (language === "my" || language === "ja"))
    return episodeTranslations[text][language === "my" ? 0 : 1];
  const writing = {
    "This wording may hurt someone. Please review it before sharing.": [
      "ဒီအသုံးအနှုန်းက တစ်ဖက်လူကို ထိခိုက်စေနိုင်ပါတယ်။ မပို့ခင် ပြန်ကြည့်ပါ။",
      "相手を傷つける可能性がある表現です。送信前に見直してください。",
    ],
    "Choose Cancel to edit your text, or OK to continue.": [
      "စာပြန်ပြင်ဖို့ Cancel ကို ရွေးပါ။ ဆက်ပို့ဖို့ OK ကို ရွေးပါ။",
      "修正するにはキャンセル、続行するにはOKを選んでください。",
    ],
    "Your text is still here. You can edit it before sharing.": [
      "ရေးထားတဲ့စာ ရှိနေပါသေးတယ်။ မပို့ခင် ပြန်ပြင်နိုင်ပါတယ်။",
      "文章は残っています。送信前に修正できます。",
    ],
    "Your thought is saved and waiting for moderation review.": [
      "စာကို သိမ်းထားပြီးပါပြီ။ စစ်ဆေးပြီးမှ အများမြင်နိုင်ပါမယ်။",
      "投稿は保存され、モデレーターの確認を待っています。",
    ],
    "Your reply is saved and waiting for moderation review.": [
      "ပြန်စာကို သိမ်းထားပြီးပါပြီ။ စစ်ဆေးပြီးမှ အများမြင်နိုင်ပါမယ်။",
      "返信は保存され、モデレーターの確認を待っています。",
    ],
    "This message may contain a threat or targeted personal information. Please edit it before sending.":
      [
        "ခြိမ်းခြောက်မှု သို့မဟုတ် တစ်ဦးတစ်ယောက်ကို ပစ်မှတ်ထားတဲ့ ကိုယ်ရေးအချက်အလက် ပါနိုင်ပါတယ်။ မပို့ခင် ပြန်ပြင်ပါ။",
        "脅迫や個人情報を使った攻撃の可能性があります。送信前に修正してください。",
      ],
    "This text may contain hurtful or threatening wording. Context matters. You can report it or block the sender.":
      [
        "ထိခိုက်စေတဲ့ သို့မဟုတ် ခြိမ်းခြောက်တဲ့ အသုံးအနှုန်း ပါနိုင်ပါတယ်။ အကြောင်းအရာကိုပါ ကြည့်ဖို့လိုပါတယ်။ Report သို့မဟုတ် Block လုပ်နိုင်ပါတယ်။",
        "攻撃的・脅迫的な表現の可能性があります。文脈も大切です。通報やブロックができます。",
      ],
    "Automatic checks can make mistakes. A moderator can review the context.": [
      "အလိုအလျောက်စစ်ဆေးမှု မှားနိုင်ပါတယ်။ တာဝန်ရှိသူက အကြောင်းအရာကို ပြန်စစ်နိုင်ပါတယ်။",
      "自動判定は間違うことがあります。モデレーターが文脈を確認できます。",
    ],
    "A few words or a whole story. Both belong here.": [
      "စာတိုလေးဖြစ်ဖြစ် ဇာတ်လမ်းရှည်ဖြစ်ဖြစ် ဒီမှာ ရေးနိုင်ပါတယ်။",
      "短い言葉も、長い物語も。どちらもここに書けます。",
    ],
    "Title (optional)": ["ခေါင်းစဉ် (မထည့်လည်းရပါတယ်)", "タイトル（任意）"],
    "Add a title": ["ခေါင်းစဉ် ထည့်မယ်", "タイトルを追加"],
    "Need a place to start?": ["ဘယ်ကစရေးရမလဲ မသိဘူးလား။", "書き始めるヒント"],
    "What do you miss most?": [
      "ဘာကို အလွမ်းဆုံးလဲ။",
      "いちばん恋しいものは何ですか？",
    ],
    "What happened that day?": [
      "အဲဒီနေ့က ဘာဖြစ်ခဲ့တာလဲ။",
      "あの日、何がありましたか？",
    ],
    "What did you never get to say?": [
      "မပြောဖြစ်ခဲ့တဲ့စကားက ဘာလဲ။",
      "伝えられなかった言葉はありますか？",
    ],
    "Clear prompt": ["မေးခွန်း ဖယ်မယ်", "ヒントを消す"],
    "Add next part": ["နောက်တစ်ပိုင်း ဆက်ရေးမယ်", "次のパートを追加"],
    "There is no room for another part. Save this thought first.": [
      "စာလုံးရေ ပြည့်နေပါပြီ။ ဒီစာကို အရင်သိမ်းပါ။",
      "文字数の上限です。まずこの文章を保存してください。",
    ],
  };
  if (writing[text] && (language === "my" || language === "ja"))
    return writing[text][language === "my" ? 0 : 1];
  if (language === "en" || typeof text !== "string") return text;
  if (language === "ja") {
    if (ja[text]) return ja[text];
    const hours = text.match(/^(\d+) hours ago$/);
    if (hours) return `${hours[1]}時間前`;
    const length = text.match(
      /^(body|reason) must be between (\d+) and (\d+) characters\.$/,
    );
    if (length)
      return `${length[1] === "body" ? "本文" : "理由"}は${length[2]}〜${length[3]}文字で入力してください。`;
    return text;
  }
  if (my[text]) return my[text];
  const hours = text.match(/^(\d+) hours ago$/);
  if (hours) return `${Number(hours[1]).toLocaleString("my")} နာရီအကြာက`;
  const length = text.match(
    /^(body|reason) must be between (\d+) and (\d+) characters\.$/,
  );
  if (length)
    return `${length[1] === "body" ? "စာသား" : "အကြောင်းပြချက်"}မှာ စာလုံး ${length[2]} မှ ${length[3]} လုံးအထိ ရှိရပါမယ်။`;
  return text;
}
