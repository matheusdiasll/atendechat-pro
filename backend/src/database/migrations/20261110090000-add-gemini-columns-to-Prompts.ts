import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    try {
      await queryInterface.addColumn("Prompts", "apiKey2", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      });
    } catch (e) {
      // column might already exist
    }

    try {
      await queryInterface.addColumn("Prompts", "provider", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "gemini"
      });
    } catch (e) {
      // column might already exist
    }

    try {
      await queryInterface.addColumn("Prompts", "model", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "gemini-3.8-flash"
      });
    } catch (e) {
      // column might already exist
    }

    try {
      await queryInterface.addColumn("Prompts", "knowledgePdf", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
      });
    } catch (e) {
      // column might already exist
    }
  },

  down: async (queryInterface: QueryInterface) => {
    try {
      await queryInterface.removeColumn("Prompts", "apiKey2");
      await queryInterface.removeColumn("Prompts", "provider");
      await queryInterface.removeColumn("Prompts", "model");
      await queryInterface.removeColumn("Prompts", "knowledgePdf");
    } catch (e) {
      // ignore
    }
  }
};
