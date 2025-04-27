const API = {
    baseUrl: '',

    getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    },

    async get(endpoint) {
        const response = await fetch(this.baseUrl + endpoint, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    async post(endpoint, data) {
        const response = await fetch(this.baseUrl + endpoint, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    async put(endpoint, data) {
        const response = await fetch(this.baseUrl + endpoint, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },

    async delete(endpoint) {
        const response = await fetch(this.baseUrl + endpoint, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    }
};
