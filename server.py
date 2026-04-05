from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for the browser extension

@app.route('/', methods=['GET'])
def index():
    return "Auto Hitter Python Server is running! Use miniapp.html to control."

# In-memory storage for the current auto-hit session
current_session = {
    "active": False,
    "url": "",
    "bin": "",
    "count": 0,
    "tries": 0,
    "status_logs": []
}

@app.route('/start-session', methods=['POST'])
def start_session():
    global current_session
    data = request.json
    current_session = {
        "active": True,
        "url": data.get("url", ""),
        "bin": data.get("bin", ""),
        "count": int(data.get("count", 0)),
        "tries": 0,
        "status_logs": [{"text": "Session started via Python API", "status": "success"}]
    }
    return jsonify({"message": "Session started", "session": current_session})

@app.route('/get-session', methods=['GET'])
def get_session():
    return jsonify(current_session)

@app.route('/update-status', methods=['POST'])
def update_status():
    global current_session
    data = request.json
    log_entry = {
        "text": data.get("text", ""),
        "status": data.get("status", "")
    }
    current_session["status_logs"].append(log_entry)
    
    # Update tries if reported
    if "Try" in log_entry["text"]:
        current_session["tries"] += 1
        
    if "Stopping" in log_entry["text"] or "Success" in log_entry["text"]:
        current_session["active"] = False
        
    return jsonify({"success": True})

@app.route('/clear-session', methods=['POST'])
def clear_session():
    global current_session
    current_session["active"] = False
    return jsonify({"success": True})

if __name__ == '__main__':
    print("Auto Hitter Python Server running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
