import sys

import httpx

def main():
    prompt = " ".join(sys.argv[1:]) or input("Enter your prompt: ")
    print("\n\033[1mFinal Answer\033[0m\n")

    with httpx.stream(
        "POST",
        "http://localhost:8000/query/stream",
        json={"prompt": prompt},
        timeout=None,
    ) as response:
        response.raise_for_status()
        for chunk in response.iter_text():
            if chunk:
                print(chunk, end="", flush=True)
    print()

if __name__ == "__main__":
    main()
