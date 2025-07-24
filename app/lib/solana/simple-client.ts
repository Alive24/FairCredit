import { Connection, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, getHubPDA, getCoursePDA, getProviderPDA } from "./config";

export class SimpleFairCreditClient {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Fetch and decode Hub account data
   */
  async getHub() {
    try {
      const [hubPDA] = getHubPDA();
      const accountInfo = await this.connection.getAccountInfo(hubPDA);
      
      if (!accountInfo) {
        console.log("Hub account not found");
        return null;
      }

      // For now, return a mock hub data based on our deployment
      // In production, you would decode the account data properly
      return {
        authority: new PublicKey("F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs"),
        acceptedProviders: [new PublicKey("8NY4S4qwomeR791SRvFrj51vEayN3V4TLq37uBzEj5pn")],
        acceptedEndorsers: [],
        acceptedCourses: ["SOLANA101"],
      };
    } catch (error) {
      console.error("Error fetching hub:", error);
      return null;
    }
  }

  /**
   * Fetch course data (mocked for now)
   */
  async getCourse(courseId: string) {
    try {
      const [coursePDA] = getCoursePDA(courseId);
      const accountInfo = await this.connection.getAccountInfo(coursePDA);
      
      if (!accountInfo) {
        console.log("Course account not found");
        return null;
      }

      // Return mock data for our deployed course
      if (courseId === "SOLANA101") {
        return {
          id: "SOLANA101",
          name: "Introduction to Solana Development",
          description: "Learn the fundamentals of Solana blockchain development",
          provider: new PublicKey("8NY4S4qwomeR791SRvFrj51vEayN3V4TLq37uBzEj5pn"),
          status: { draft: {} },
          workloadRequired: 100,
          created: { toNumber: () => Date.now() / 1000 },
          updated: { toNumber: () => Date.now() / 1000 },
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching course:", error);
      return null;
    }
  }

  /**
   * Fetch provider data (mocked for now)
   */
  async getProvider(providerWallet: PublicKey) {
    try {
      const [providerPDA] = getProviderPDA(providerWallet);
      const accountInfo = await this.connection.getAccountInfo(providerPDA);
      
      if (!accountInfo) {
        console.log("Provider account not found");
        return null;
      }

      // Return mock data for our deployed provider
      if (providerWallet.toString() === "8NY4S4qwomeR791SRvFrj51vEayN3V4TLq37uBzEj5pn") {
        return {
          wallet: providerWallet,
          name: "Solana Academy",
          description: "Premier Solana education provider",
          website: "https://solana-academy.com",
          email: "contact@solana-academy.com",
          providerType: "education",
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching provider:", error);
      return null;
    }
  }

  /**
   * Get all accepted courses with details
   */
  async getAllAcceptedCoursesWithDetails() {
    try {
      const hub = await this.getHub();
      if (!hub) return [];

      const courses = [];
      for (const courseId of hub.acceptedCourses) {
        const courseData = await this.getCourse(courseId);
        if (courseData) {
          const providerData = await this.getProvider(courseData.provider);
          
          courses.push({
            id: courseId,
            name: courseData.name,
            description: courseData.description,
            status: courseData.status,
            workloadRequired: courseData.workloadRequired,
            provider: courseData.provider.toString(),
            providerName: providerData?.name || "Unknown Provider",
            providerEmail: providerData?.email || "",
            created: new Date(courseData.created.toNumber() * 1000),
            updated: new Date(courseData.updated.toNumber() * 1000),
          });
        }
      }
      
      return courses;
    } catch (error) {
      console.error("Error fetching courses:", error);
      return [];
    }
  }
}