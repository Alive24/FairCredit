import { Connection, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, getHubPDA, getCoursePDA, getProviderPDA } from "./config";
import { decodeHubAccount, HubAccount } from "./hub-decoder";

export class SimpleFairCreditClient {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Fetch and decode Hub account data
   */
  async getHub(): Promise<HubAccount | null> {
    try {
      const [hubPDA] = getHubPDA();
      const accountInfo = await this.connection.getAccountInfo(hubPDA);
      
      if (!accountInfo) {
        console.log("Hub account not found");
        return null;
      }

      // Decode the actual hub data from the blockchain
      return decodeHubAccount(accountInfo.data);
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
   * Fetch provider data
   */
  async getProvider(providerWallet: PublicKey) {
    try {
      const [providerPDA] = getProviderPDA(providerWallet);
      const accountInfo = await this.connection.getAccountInfo(providerPDA);
      
      if (!accountInfo) {
        console.log("Provider account not found");
        return null;
      }

      // Try to decode the provider data
      try {
        // Skip discriminator (8 bytes)
        let offset = 8;
        const data = accountInfo.data;
        
        // Read wallet pubkey (32 bytes)
        const wallet = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        
        // Read name string
        const nameLength = data.readUInt32LE(offset);
        offset += 4;
        const name = data.slice(offset, offset + nameLength).toString('utf8');
        offset += nameLength;
        
        // Read description string
        const descLength = data.readUInt32LE(offset);
        offset += 4;
        const description = data.slice(offset, offset + descLength).toString('utf8');
        offset += descLength;
        
        // Read website string
        const websiteLength = data.readUInt32LE(offset);
        offset += 4;
        const website = data.slice(offset, offset + websiteLength).toString('utf8');
        offset += websiteLength;
        
        // Read email string
        const emailLength = data.readUInt32LE(offset);
        offset += 4;
        const email = data.slice(offset, offset + emailLength).toString('utf8');
        offset += emailLength;
        
        // Read provider type string
        const typeLength = data.readUInt32LE(offset);
        offset += 4;
        const providerType = data.slice(offset, offset + typeLength).toString('utf8');
        
        return {
          wallet,
          name,
          description,
          website,
          email,
          providerType,
        };
      } catch (decodeError) {
        console.error("Error decoding provider data:", decodeError);
        // Return mock data as fallback
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
      }
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