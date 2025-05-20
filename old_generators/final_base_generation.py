import subprocess
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
db_generator = THIS_DIR / "database_generator.py"
random_base = THIS_DIR / "random_base_optimized.py"

# Step 1: Run Database Generator (create schema + seed)
print("🚀 Running database generator...")
subprocess.run(["python", str(db_generator), "--scale", "1.0"], check=True)

# Step 2: Run Random Base Optimized to refine the data
print("📦 Running random base data injector...")
subprocess.run(["python", str(random_base)], check=True)

print("✔️ Database fully created and populated.")
