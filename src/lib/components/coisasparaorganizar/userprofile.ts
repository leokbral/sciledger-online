interface UserProfile {
    name: string;
    email: string;
    password: string;
    profilePicture?: string;
    interestAreas: string[]; // User's interest areas
}
const userProfiles: UserProfile[] = [
    {
        name: "Alice Johnson",
        email: "alice@example.com",
        password: "password123",
        profilePicture: "https://via.placeholder.com/150",
        interestAreas: ["Biology", "Physics", "Technology"]
    },
    {
        name: "Bob Smith",
        email: "bob@example.com",
        password: "securepassword",
        profilePicture: "https://via.placeholder.com/150",
        interestAreas: ["Medicine", "Chemistry", "Environment"]
    },
    {
        name: "Charlie Brown",
        email: "charlie@example.com",
        password: "123456",
        profilePicture: "https://via.placeholder.com/150",
        interestAreas: ["Astronomy", "Artificial Intelligence", "Neuroscience"]
    }
];

export { userProfiles };
