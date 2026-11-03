import os

file_path = "src/components/PatientRecords.jsx"

if not os.path.exists(file_path):
    print(f"Error: '{file_path}' ফাইলটি পাওয়া যায়নি!")
    exit()

with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

print("Force cleaning conversation text from PatientRecords.jsx...")

# ফাইলের শুরু থেকে যেকোনো অপ্রয়োজনীয় প্যারাগ্রাফ বা টেক্সট রিমুভ করার জন্য সঠিক স্টার্টিং পয়েন্ট খোঁজা
lines = code.split("\n")
clean_lines = []
start_recording = False

for line in lines:
    # যখনই কোনো জাভাস্ক্রিপ্ট ইম্পোর্ট বা কম্পোনেন্ট ডিক্লেয়ারেশন শুরু হবে, তখন থেকে রাখা শুরু করব
    if line.strip().startswith("import") or line.strip().startswith("export") or line.strip().startswith("function") or line.strip().startswith("const"):
        start_recording = True
    
    if start_recording:
        clean_lines.append(line)

if clean_lines:
    code = "\n".join(clean_lines)
else:
    # যদি কিওয়ার্ড না পাওয়া যায়, তবে অন্তত ফাইলের ভেতরের কোড রাখার চেষ্টা করা
    pass

# যে ৩টি ট্যাব রিমুভ করতে চান সেগুলোর রেফারেন্স ক্লিন করা
for tab in ["Tooth Timeline", "Lab Orders", "Post-Op Recovery"]:
    code = code.replace(tab, "")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Success! ফাইলটি সফলভাবে ফোর্সবিকভাবে ক্লিন করা হয়েছে।")